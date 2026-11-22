package com.belka.duonest.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import androidx.annotation.Nullable;
import com.belka.duonest.R;

/** Home-screen widget with the shared doodle ("Wspólny rysunek"). */
public class DoodleWidgetProvider extends AppWidgetProvider {

    static final String ACTION_REFRESH = "com.belka.duonest.widget.DOODLE_REFRESH";

    private static final long MIN_RENDER_INTERVAL_MS = 150;
    // RGB_565 bitmap of at most ~600 KB stays below the RemoteViews transaction limit.
    private static final int MAX_BITMAP_PIXELS = 300_000;
    private static final int PADDING_DP = 16;
    private static final int HEADER_DP = 28;
    private static final int GAP_DP = 10;

    private static final Object LOCK = new Object();
    private static Handler renderHandler;
    private static boolean renderPending;
    private static long lastRenderAt;

    private static final android.util.SparseArray<DoodleWidgetStore.Snapshot> displayed = new android.util.SparseArray<>();

    @Override
    public void onDeleted(Context context, int[] ids) {
        synchronized (DoodleWidgetProvider.class) {
            for (int id : ids) displayed.remove(id);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        synchronized (DoodleWidgetProvider.class) {
            for (int id : appWidgetIds) displayed.remove(id);
        }
        requestRender(context);
        DoodleRefreshWorker.enqueue(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int appWidgetId, Bundle newOptions) {
        synchronized (DoodleWidgetProvider.class) { displayed.remove(appWidgetId); }
        requestRender(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_REFRESH.equals(intent.getAction())) {
            requestRender(context);
            return;
        }
        super.onReceive(context, intent);
    }

    /** Coalesces bursts of live strokes into at most one widget update per interval. */
    static void requestRender(Context context) {
        Context app = context.getApplicationContext();
        synchronized (LOCK) {
            if (renderPending) return;
            renderPending = true;
            if (renderHandler == null) {
                HandlerThread thread = new HandlerThread("DuoWidgetRender");
                thread.start();
                renderHandler = new Handler(thread.getLooper());
            }
            long delay = Math.max(0, lastRenderAt + MIN_RENDER_INTERVAL_MS - SystemClock.uptimeMillis());
            renderHandler.postDelayed(() -> {
                synchronized (LOCK) {
                    renderPending = false;
                    lastRenderAt = SystemClock.uptimeMillis();
                }
                renderAll(app);
            }, delay);
        }
    }

    /** Hides the "rysuje" badge even if no other update arrives. */
    static void scheduleDrawingExpiry(Context context, long delayMs) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        Intent intent = new Intent(context, DoodleWidgetProvider.class).setAction(ACTION_REFRESH);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            1,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        alarms.set(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + delayMs + 500, pending);
    }

    static synchronized void renderAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, DoodleWidgetProvider.class));
        if (ids.length == 0) return;
        DoodleWidgetStore.Snapshot snapshot = DoodleWidgetStore.get(context).snapshot();
        for (int id : ids) {
            try {
                DoodleWidgetStore.Snapshot previous = displayed.get(id);
                boolean sameBoard = previous != null && previous.connected == snapshot.connected &&
                    previous.strokes.equals(snapshot.strokes) && previous.partnerName.equals(snapshot.partnerName);
                if (sameBoard && previous.partnerDrawing == snapshot.partnerDrawing &&
                    previous.authorName.equals(snapshot.authorName)) continue;
                RemoteViews views = buildViews(context, manager, id, snapshot, !sameBoard);
                // A bitmap belongs to a complete update. Partial updates can leave
                // an older bitmap in the launcher cache.
                if (!sameBoard) manager.updateAppWidget(id, views);
                else manager.partiallyUpdateAppWidget(id, views);
                displayed.put(id, snapshot);
            } catch (RuntimeException e) {
                Log.w("DuoWidget", "Widget update failed", e);
            }
        }
    }

    private static RemoteViews buildViews(Context context, AppWidgetManager manager, int id, DoodleWidgetStore.Snapshot snapshot, boolean updateBoard) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_doodle);
        PendingIntent open = launchIntent(context);
        if (open != null) views.setOnClickPendingIntent(R.id.widget_root, open);

        String partner = snapshot.partnerName.isEmpty() ? null : snapshot.partnerName;
        boolean hasContent = snapshot.connected && !snapshot.strokes.isEmpty();

        if (snapshot.connected && snapshot.partnerDrawing) {
            views.setViewVisibility(R.id.widget_live, View.VISIBLE);
            views.setTextViewText(R.id.widget_live_text, context.getString(R.string.widget_doodle_drawing, partner != null ? partner : context.getString(R.string.widget_doodle_partner)));
            views.setViewVisibility(R.id.widget_meta, View.GONE);
        } else {
            views.setViewVisibility(R.id.widget_live, View.GONE);
            boolean showAuthor = hasContent && !snapshot.authorName.isEmpty();
            views.setViewVisibility(R.id.widget_meta, showAuthor ? View.VISIBLE : View.GONE);
            if (showAuthor) views.setTextViewText(R.id.widget_meta, snapshot.authorName);
        }

        Bundle options = manager.getAppWidgetOptions(id);
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 320);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 180);
        boolean compact = width < 150 || height < 100;
        views.setViewVisibility(R.id.widget_title, compact ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widget_header, compact && !snapshot.partnerDrawing ? View.GONE : View.VISIBLE);
        int padding = Math.round((compact ? 3 : PADDING_DP) * context.getResources().getDisplayMetrics().density);
        views.setViewPadding(R.id.widget_root, padding, padding, padding, padding);
        if (compact && snapshot.partnerDrawing) {
            views.setTextViewText(R.id.widget_live_text, "Rysuje…");
        }
        if (!updateBoard) return views;
        if (hasContent) {
            Bitmap bitmap = renderBoard(context, manager, id, snapshot);
            views.setImageViewBitmap(R.id.widget_doodle, bitmap);
            views.setViewVisibility(R.id.widget_doodle, View.VISIBLE);
            views.setViewVisibility(R.id.widget_empty, View.GONE);
        } else {
            views.setViewVisibility(R.id.widget_doodle, View.GONE);
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            views.setTextViewText(R.id.widget_empty_text, !snapshot.connected
                ? context.getString(R.string.widget_doodle_signed_out)
                : context.getString(R.string.widget_doodle_empty, partner != null ? partner : context.getString(R.string.widget_doodle_partner_dative)));
        }
        return views;
    }

    private static Bitmap renderBoard(Context context, AppWidgetManager manager, int id, DoodleWidgetStore.Snapshot snapshot) {
        Bundle options = manager.getAppWidgetOptions(id);
        int widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (widthDp <= 0) widthDp = 320;
        if (heightDp <= 0) heightDp = 180;

        float density = context.getResources().getDisplayMetrics().density;
        float boardWidth = Math.max(80, widthDp - 2 * PADDING_DP) * density;
        float boardHeight = Math.max(60, heightDp - 2 * PADDING_DP - HEADER_DP - GAP_DP) * density;
        float scale = (float) Math.min(1.0, Math.sqrt(MAX_BITMAP_PIXELS / (boardWidth * boardHeight)));

        int width = Math.max(1, Math.round(boardWidth * scale));
        int height = Math.max(1, Math.round(boardHeight * scale));
        return DoodleRenderer.render(snapshot.strokes, width, height, density, scale);
    }

    @Nullable
    private static PendingIntent launchIntent(Context context) {
        Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (intent == null) return null;
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
}

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
import java.util.List;

/** Home-screen widget with the shared doodle ("Wspólny rysunek"). */
public class DoodleWidgetProvider extends AppWidgetProvider {

    static final String ACTION_REFRESH = "com.belka.duonest.widget.DOODLE_REFRESH";

    private static final long MIN_RENDER_INTERVAL_MS = 120;
    // RGB_565 bitmap of at most ~600 KB stays below the RemoteViews transaction limit.
    private static final int MAX_BITMAP_PIXELS = 300_000;
    private static final int PADDING_DP = 16;
    private static final int COMPACT_PADDING_DP = 3;
    private static final int HEADER_DP = 28;
    private static final int GAP_DP = 10;

    private static final Object LOCK = new Object();
    private static Handler renderHandler;
    private static boolean renderPending;
    private static long lastRenderAt;

    private static final class DisplayedState {
        final boolean connected;
        final List<DoodleStroke> strokes;
        final boolean partnerDrawing;
        final String liveLabel;
        final String authorName;
        final int widthDp;
        final int heightDp;
        final boolean compact;
        final boolean headerVisible;
        @Nullable final Bitmap bitmap;

        DisplayedState(
            boolean connected,
            List<DoodleStroke> strokes,
            boolean partnerDrawing,
            String liveLabel,
            String authorName,
            int widthDp,
            int heightDp,
            boolean compact,
            boolean headerVisible,
            @Nullable Bitmap bitmap
        ) {
            this.connected = connected;
            this.strokes = strokes;
            this.partnerDrawing = partnerDrawing;
            this.liveLabel = liveLabel;
            this.authorName = authorName;
            this.widthDp = widthDp;
            this.heightDp = heightDp;
            this.compact = compact;
            this.headerVisible = headerVisible;
            this.bitmap = bitmap;
        }
    }

    private static final android.util.SparseArray<DisplayedState> displayed = new android.util.SparseArray<>();

    @Override
    public void onDeleted(Context context, int[] ids) {
        synchronized (DoodleWidgetProvider.class) {
            for (int id : ids) displayed.remove(id);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        restore(context, appWidgetIds);
        DoodleRefreshWorker.schedulePeriodic(context);
    }

    @Override
    public void onDisabled(Context context) {
        DoodleRefreshWorker.cancelPeriodic(context);
    }

    static void restore(Context context) {
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, DoodleWidgetProvider.class));
        restore(context, ids);
    }

    private static void restore(Context context, int[] ids) {
        // The launcher may have discarded its RemoteViews after an update or restore.
        synchronized (DoodleWidgetProvider.class) {
            for (int id : ids) displayed.remove(id);
        }
        requestRender(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int appWidgetId, Bundle newOptions) {
        requestRender(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_REFRESH.equals(intent.getAction())) {
            requestRender(context);
            PendingResult result = goAsync();
            DoodleWidgetSync.refreshAsync(context, result::finish);
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
        PendingIntent pending = expiryPendingIntent(context);
        alarms.set(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + delayMs + 500, pending);
    }

    static void cancelDrawingExpiry(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        alarms.cancel(expiryPendingIntent(context));
    }

    private static PendingIntent expiryPendingIntent(Context context) {
        Intent intent = new Intent(context, DoodleWidgetProvider.class).setAction(ACTION_REFRESH);
        return PendingIntent.getBroadcast(
            context,
            1,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }

    static synchronized void renderAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, DoodleWidgetProvider.class));
        if (ids.length == 0) return;
        DoodleWidgetStore.Snapshot snapshot = DoodleWidgetStore.get(context).snapshot();
        for (int id : ids) {
            try {
                Bundle options = manager.getAppWidgetOptions(id);
                int widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
                int heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
                if (widthDp <= 0) widthDp = 320;
                if (heightDp <= 0) heightDp = 180;
                boolean compact = widthDp < 205 || heightDp < 100;
                boolean headerVisible = !compact;
                boolean partnerDrawing = headerVisible && snapshot.connected && snapshot.partnerDrawing;
                String liveLabel = partnerDrawing ? resolveLiveLabel(context, snapshot) : "";
                String authorLabel = (headerVisible && !partnerDrawing && snapshot.connected && !snapshot.strokes.isEmpty())
                    ? snapshot.authorName
                    : "";

                DisplayedState previous = displayed.get(id);
                boolean sameBoard = previous != null &&
                    previous.connected == snapshot.connected &&
                    previous.widthDp == widthDp &&
                    previous.heightDp == heightDp &&
                    previous.compact == compact &&
                    previous.headerVisible == headerVisible &&
                    previous.strokes.equals(snapshot.strokes);
                boolean sameHeader = previous != null &&
                    previous.partnerDrawing == partnerDrawing &&
                    previous.liveLabel.equals(liveLabel) &&
                    previous.authorName.equals(authorLabel);

                if (sameBoard && sameHeader) continue;

                boolean hasContent = snapshot.connected && !snapshot.strokes.isEmpty();
                Bitmap bitmap = null;
                if (hasContent) {
                    bitmap = (sameBoard && previous.bitmap != null)
                        ? previous.bitmap
                        : renderBoard(context, snapshot, widthDp, heightDp, compact, headerVisible);
                }

                RemoteViews views = buildViews(
                    context, snapshot, compact, partnerDrawing, liveLabel, authorLabel, bitmap,
                    previous == null, !sameBoard, paddingDp(widthDp, heightDp)
                );
                if (previous == null) manager.updateAppWidget(id, views);
                else manager.partiallyUpdateAppWidget(id, views);
                displayed.put(id, new DisplayedState(
                    snapshot.connected, snapshot.strokes, partnerDrawing, liveLabel, authorLabel,
                    widthDp, heightDp, compact, headerVisible, bitmap
                ));
            } catch (RuntimeException e) {
                Log.w("DuoWidget", "Widget update failed", e);
            }
        }
    }

    private static String resolveLiveLabel(Context context, DoodleWidgetStore.Snapshot snapshot) {
        String partner = snapshot.partnerName.isEmpty()
            ? context.getString(R.string.widget_doodle_partner)
            : snapshot.partnerName;
        return context.getString(R.string.widget_doodle_drawing, partner);
    }

    private static void applyHeaderState(
        RemoteViews views,
        boolean partnerDrawing,
        String liveLabel,
        String authorLabel
    ) {
        if (partnerDrawing) {
            views.setTextViewText(R.id.widget_live_text, liveLabel);
            views.setViewVisibility(R.id.widget_live, View.VISIBLE);
            views.setViewVisibility(R.id.widget_meta, View.GONE);
        } else {
            views.setViewVisibility(R.id.widget_live, View.GONE);
            boolean showAuthor = !authorLabel.isEmpty();
            views.setViewVisibility(R.id.widget_meta, showAuthor ? View.VISIBLE : View.GONE);
            if (showAuthor) views.setTextViewText(R.id.widget_meta, authorLabel);
        }
    }

    private static RemoteViews buildViews(
        Context context,
        DoodleWidgetStore.Snapshot snapshot,
        boolean compact,
        boolean partnerDrawing,
        String liveLabel,
        String authorLabel,
        @Nullable Bitmap bitmap,
        boolean firstRender,
        boolean boardChanged,
        int paddingDp
    ) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_doodle);
        if (firstRender) {
            PendingIntent open = launchIntent(context);
            if (open != null) views.setOnClickPendingIntent(R.id.widget_root, open);
        }

        applyHeaderState(views, partnerDrawing, liveLabel, authorLabel);

        views.setViewVisibility(R.id.widget_header, compact ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widget_board_gap, compact ? View.GONE : View.VISIBLE);
        int padding = Math.round(paddingDp * context.getResources().getDisplayMetrics().density);
        views.setViewPadding(R.id.widget_root, padding, padding, padding, padding);

        if (!boardChanged) return views;
        views.setInt(R.id.widget_empty, "setBackgroundResource", compact ? android.R.color.transparent : R.drawable.widget_empty_bg);
        views.setViewVisibility(R.id.widget_empty_text, compact ? View.GONE : View.VISIBLE);
        if (bitmap != null) {
            views.setImageViewBitmap(R.id.widget_doodle, bitmap);
            views.setViewVisibility(R.id.widget_doodle, View.VISIBLE);
            views.setViewVisibility(R.id.widget_empty, View.GONE);
        } else {
            views.setImageViewBitmap(R.id.widget_doodle, null);
            views.setViewVisibility(R.id.widget_doodle, View.GONE);
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            views.setTextViewText(R.id.widget_empty_text, !snapshot.connected
                ? context.getString(R.string.widget_doodle_signed_out)
                : context.getString(R.string.widget_doodle_empty));
        }
        return views;
    }

    private static int paddingDp(int widthDp, int heightDp) {
        return Math.min(widthDp, heightDp) < 85 ? COMPACT_PADDING_DP : PADDING_DP;
    }

    private static Bitmap renderBoard(
        Context context,
        DoodleWidgetStore.Snapshot snapshot,
        int widthDp,
        int heightDp,
        boolean compact,
        boolean headerVisible
    ) {
        float density = context.getResources().getDisplayMetrics().density;
        int padDp = paddingDp(widthDp, heightDp);
        int headerSpaceDp = headerVisible ? HEADER_DP + GAP_DP : 0;
        float boardWidth = Math.max(1, widthDp - 2 * padDp) * density;
        float boardHeight = Math.max(1, heightDp - 2 * padDp - headerSpaceDp) * density;
        float scale = (float) Math.min(1.0, Math.sqrt(MAX_BITMAP_PIXELS / (boardWidth * boardHeight)));

        int width = Math.max(1, Math.round(boardWidth * scale));
        int height = Math.max(1, Math.round(boardHeight * scale));
        return DoodleRenderer.render(snapshot.strokes, width, height, density, scale, !compact);
    }

    @Nullable
    private static PendingIntent launchIntent(Context context) {
        Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (intent == null) return null;
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
}

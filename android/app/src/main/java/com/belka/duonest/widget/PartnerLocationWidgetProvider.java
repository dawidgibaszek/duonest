package com.belka.duonest.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.text.format.DateFormat;
import android.util.Log;
import android.util.SparseArray;
import android.view.View;
import android.widget.RemoteViews;
import androidx.work.WorkManager;
import com.belka.duonest.MainActivity;
import com.belka.duonest.R;
import java.util.Date;
import java.util.Objects;

public class PartnerLocationWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_EXPIRE = "com.belka.duonest.widget.LOCATION_EXPIRE";
    private static final int OPEN_LOCATION = 501;
    private static final int EXPIRE_LOCATION = 502;
    private static final SparseArray<Display> displayed = new SparseArray<>();
    private static long scheduledExpiry = -1;

    private record Display(int layout, String name, String address, String time, Uri maps, Bitmap map) {}

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        restore(context, appWidgetIds);
        // A completed one-shot WorkManager job can change package components and trigger onUpdate again.
        PartnerLocationRefreshWorker.schedulePeriodic(context);
    }

    static void restore(Context context) {
        restore(context, AppWidgetManager.getInstance(context).getAppWidgetIds(component(context)));
    }

    private static synchronized void restore(Context context, int[] ids) {
        for (int id : ids) displayed.remove(id);
        render(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_EXPIRE.equals(intent.getAction())) {
            synchronized (PartnerLocationWidgetProvider.class) {
                scheduledExpiry = -1;
                render(context);
            }
            return;
        }
        super.onReceive(context, intent);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        render(context);
    }

    @Override
    public void onDeleted(Context context, int[] ids) {
        synchronized (PartnerLocationWidgetProvider.class) {
            for (int id : ids) displayed.remove(id);
        }
    }

    @Override
    public void onDisabled(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(PartnerLocationRefreshWorker.WORK_NAME);
        WorkManager.getInstance(context).cancelUniqueWork(PartnerLocationRefreshWorker.PERIODIC_WORK_NAME);
        scheduleExpiry(context, 0);
        DoodleWidgetStore store = DoodleWidgetStore.get(context);
        DoodleWidgetStore.Session session = store.session();
        if (session != null) store.setPartnerLocation(session, null, false, null);
    }

    static boolean hasWidgets(Context context) {
        return AppWidgetManager.getInstance(context).getAppWidgetIds(component(context)).length > 0;
    }

    static synchronized void render(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(component(context));
        if (ids.length == 0) return;

        DoodleWidgetStore store = DoodleWidgetStore.get(context);
        PartnerLocation location;
        Bitmap map;
        String name;
        boolean connected;
        synchronized (store) {
            connected = store.session() != null;
            location = store.partnerLocation();
            map = store.partnerLocationMap();
            name = store.partnerName();
        }
        String title = connected && !name.isEmpty() ? name : context.getString(R.string.widget_location_title);
        String address;
        String timeLabel = "";
        Uri maps = null;
        if (location != null) {
            address = location.address.isEmpty() ? context.getString(R.string.widget_location_no_address) : location.address;
            Date time = new Date(location.capturedAt);
            String readAt = DateFormat.getDateFormat(context).format(time) + " · " + DateFormat.getTimeFormat(context).format(time);
            timeLabel = context.getString(R.string.widget_location_read_at, readAt);
            maps = Uri.parse("https://www.google.com/maps/search/").buildUpon()
                .appendQueryParameter("api", "1")
                .appendQueryParameter("query", location.latitude + "," + location.longitude)
                .build();
        } else {
            address = context.getString(connected ? R.string.widget_location_unavailable : R.string.widget_location_signed_out);
        }
        for (int id : ids) {
            Bundle options = manager.getAppWidgetOptions(id);
            int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
            int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
            boolean wide = width >= 225 && width >= height * 1.25;
            int layout = wide ? R.layout.widget_partner_location_wide : R.layout.widget_partner_location;
            Display next = new Display(layout, title, address, timeLabel, maps, map);
            Display previous = displayed.get(id);
            if (next.equals(previous)) continue;
            try {
                update(context, manager, id, previous, next);
                displayed.put(id, next);
            } catch (RuntimeException error) {
                Log.w("DuoWidget", "Location widget update failed", error);
            }
        }
        scheduleExpiry(context, location == null ? 0 : location.expiresAt);
    }

    private static void update(Context context, AppWidgetManager manager, int id, Display previous, Display next) {
        boolean full = previous == null || previous.layout != next.layout;
        RemoteViews views = new RemoteViews(context.getPackageName(), next.layout);
        boolean located = next.maps != null;
        if (full || !next.name.equals(previous.name)) views.setTextViewText(R.id.widget_location_name, next.name);
        if (full || !next.address.equals(previous.address)) views.setTextViewText(R.id.widget_location_address, next.address);
        if (full || !next.time.equals(previous.time)) {
            views.setTextViewText(R.id.widget_location_time, next.time);
            views.setViewVisibility(R.id.widget_location_time, located ? View.VISIBLE : View.GONE);
        }
        if (full || next.map != previous.map) {
            views.setImageViewBitmap(R.id.widget_location_map_image, next.map);
        }
        if (full || located != (previous.maps != null)) {
            views.setViewVisibility(R.id.widget_location_map_panel, located ? View.VISIBLE : View.GONE);
        }
        if (full || !Objects.equals(next.maps, previous.maps)) {
            Intent destination = located ? new Intent(Intent.ACTION_VIEW, next.maps)
                : new Intent(context, MainActivity.class).setAction(Intent.ACTION_MAIN);
            views.setOnClickPendingIntent(R.id.widget_location_root, PendingIntent.getActivity(context, OPEN_LOCATION,
                destination.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        }
        if (full) manager.updateAppWidget(id, views);
        else manager.partiallyUpdateAppWidget(id, views);
    }

    private static synchronized void scheduleExpiry(Context context, long expiresAt) {
        if (scheduledExpiry == expiresAt) return;
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        PendingIntent pending = PendingIntent.getBroadcast(context, EXPIRE_LOCATION,
            new Intent(context, PartnerLocationWidgetProvider.class).setAction(ACTION_EXPIRE), PendingIntent.FLAG_IMMUTABLE);
        if (expiresAt == 0) alarms.cancel(pending);
        else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, expiresAt, pending);
        scheduledExpiry = expiresAt;
    }

    private static ComponentName component(Context context) {
        return new ComponentName(context, PartnerLocationWidgetProvider.class);
    }
}

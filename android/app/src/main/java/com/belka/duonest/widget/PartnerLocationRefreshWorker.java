package com.belka.duonest.widget;

import android.content.Context;
import android.graphics.Bitmap;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import org.json.JSONException;
import org.json.JSONObject;

public final class PartnerLocationRefreshWorker extends Worker {
    static final String WORK_NAME = "duonest_partner_location_widget_refresh";
    static final String PERIODIC_WORK_NAME = "duonest_partner_location_widget_periodic";
    private static final Constraints NETWORK = new Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED).build();
    private static final int TIMEOUT_MS = 4_000;

    public PartnerLocationRefreshWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
        super(context, parameters);
    }

    static void enqueue(Context context) {
        if (!PartnerLocationWidgetProvider.hasWidgets(context)) return;
        DoodleWidgetStore.Session session = DoodleWidgetStore.get(context).session();
        if (session == null || session.credential.isEmpty()) return;
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(PartnerLocationRefreshWorker.class)
            .setConstraints(NETWORK)
            .build();
        WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.KEEP, request);
    }

    static void schedulePeriodic(Context context) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(PartnerLocationRefreshWorker.class, 30, TimeUnit.MINUTES)
            .setConstraints(NETWORK)
            .build();
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC_WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        DoodleWidgetStore store = DoodleWidgetStore.get(context);
        DoodleWidgetStore.Session session = store.session();
        if (session == null || session.credential.isEmpty() || !PartnerLocationWidgetProvider.hasWidgets(context)) {
            return Result.success();
        }

        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL("https://duonestapp.pl/api/widget/location").openConnection();
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Authorization", "Bearer " + session.credential);
            int status = connection.getResponseCode();
            if (status == 401 || status == 403 || status == 426) {
                if (!isStopped()) store.setPartnerLocation(session, null, true, null);
                return Result.success();
            }
            if (status != 200) {
                Log.w("DuoWidget", "Location widget endpoint returned HTTP " + status);
                throw new IOException("Location request failed");
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                char[] chunk = new char[1024];
                StringBuilder contents = new StringBuilder();
                for (int read; (read = reader.read(chunk)) != -1;) {
                    contents.append(chunk, 0, read);
                    if (contents.length() > 16_384) throw new IOException("Invalid location response");
                }
                JSONObject response = new JSONObject(contents.toString());
                if (isStopped() || !store.sameLocationSession(session)) return Result.success();
                PartnerLocation location = PartnerLocation.fromJson(response.optJSONObject("location"));
                Bitmap map = location == null ? null : store.mapForLocation(session, location);
                if (location != null && map == null) map = PartnerLocationMap.snapshot(context, location);
                if (!isStopped()) store.setPartnerLocation(session, response, false, map);
                if (location != null && map == null && getRunAttemptCount() < 2) return Result.retry();
            }
            return Result.success();
        } catch (IOException | JSONException error) {
            // A transient error does not invalidate the last authorized position.
            PartnerLocation cached = store.partnerLocation();
            if (cached != null && !isStopped() && store.sameLocationSession(session) &&
                store.mapForLocation(session, cached) == null) {
                Bitmap map = PartnerLocationMap.snapshot(context, cached);
                if (map != null && !isStopped()) store.restoreLocationMap(session, cached, map);
            }
            return getRunAttemptCount() < 4 ? Result.retry() : Result.failure();
        } finally {
            if (connection != null) connection.disconnect();
            PartnerLocationWidgetProvider.render(context);
        }
    }
}

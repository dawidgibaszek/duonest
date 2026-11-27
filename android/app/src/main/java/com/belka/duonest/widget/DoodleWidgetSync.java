package com.belka.duonest.widget;

import android.content.Context;
import android.os.Looper;
import android.util.Log;
import androidx.annotation.Nullable;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Loads the newest partnership_doodles row while the web app is not running, with a scoped widget credential.
 */
final class DoodleWidgetSync {

    private static final String TAG = "DuoWidget";
    private static final int TIMEOUT_MS = 4000;
    private static final long PUSH_WAIT_MS = 6500;
    private static final long PUSH_DRAWING_MS = 60_000;
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    private DoodleWidgetSync() {}

    static void refreshAsync(Context context, @Nullable Runnable done) {
        Context app = context.getApplicationContext();
        EXECUTOR.execute(() -> {
            try {
                if (!refreshInternal(app, false)) {
                    DoodleRefreshWorker.enqueue(app);
                }
            } finally {
                DoodleWidgetProvider.requestRender(app);
                if (done != null) done.run();
            }
        });
    }

    /** Data-only FCM message sent by pushCore.ts to the partner's Android devices. */
    static void handlePush(Context context, Map<String, String> data) {
        Context app = context.getApplicationContext();
        DoodleWidgetStore store = DoodleWidgetStore.get(app);
        DoodleWidgetStore.Session session = store.session();
        String recipient = data.get("recipientProfileId");
        if (session == null || session.credential.isEmpty() || (!session.profileId.isEmpty() && recipient != null && !recipient.equals(session.profileId))) return;

        String senderName = data.get("senderName");
        if (senderName != null && !senderName.isEmpty()) store.setPartnerName(senderName);

        String action = data.get("action");
        if ("DOODLE_DRAWING_STATUS".equals(action)) {
            if ("false".equals(data.get("isDrawing"))) {
                store.finishPartnerDrawing();
                DoodleWidgetProvider.cancelDrawingExpiry(app);
                DoodleWidgetProvider.requestRender(app);
                return;
            }
            store.setPartnerDrawingUntil(System.currentTimeMillis() + PUSH_DRAWING_MS);
            DoodleWidgetProvider.scheduleDrawingExpiry(app, PUSH_DRAWING_MS);
            DoodleWidgetProvider.requestRender(app);
        } else if ("DOODLE_DRAWING_STOP".equals(action)) {
            store.finishPartnerDrawing();
            DoodleWidgetProvider.cancelDrawingExpiry(app);
            DoodleWidgetProvider.requestRender(app);
        } else if ("DOODLE_SAVE".equals(action) || "DOODLE_CLEAR".equals(action)) {
            String doodleId = data.get("doodleId");
            if ("DOODLE_SAVE".equals(action) && store.hasDoodleId(doodleId)) {
                store.finishPartnerDrawing();
                DoodleWidgetProvider.cancelDrawingExpiry(app);
                DoodleWidgetProvider.requestRender(app);
                return;
            }
            Runnable syncTask = () -> {
                boolean ok = refreshInternal(app, true);
                if (!ok) {
                    store.finishPartnerDrawing();
                    DoodleRefreshWorker.enqueue(app);
                }
                DoodleWidgetProvider.cancelDrawingExpiry(app);
                DoodleWidgetProvider.requestRender(app);
            };
            Future<?> future = EXECUTOR.submit(syncTask);
            if (Looper.myLooper() != Looper.getMainLooper()) {
                // Keep FCM's worker alive long enough for a cold-start HTTP fetch,
                // while staying safely below Android's 10 s BroadcastReceiver limit.
                try {
                    future.get(PUSH_WAIT_MS, TimeUnit.MILLISECONDS);
                } catch (TimeoutException e) {
                    DoodleRefreshWorker.enqueue(app);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (ExecutionException e) {
                    Log.w(TAG, "Widget push sync failed", e);
                }
            }
        }
    }

    static boolean refresh(Context context) {
        return refreshInternal(context.getApplicationContext(), false);
    }

    private static synchronized boolean refreshInternal(Context context, boolean clearDrawing) {
        DoodleWidgetStore store = DoodleWidgetStore.get(context);
        DoodleWidgetStore.Session session = store.session();
        if (session == null || session.credential.isEmpty()) {
            return true;
        }
        try {
            String previousKey = store.currentDoodleKey();
            HttpURLConnection connection = (HttpURLConnection)
                new URL("https://duonestapp.pl/api/widget/doodle").openConnection();
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Authorization", "Bearer " + session.credential);
            try {
                int status = connection.getResponseCode();
                if (status == 401 || status == 403 || status == 426) {
                    store.clearRevokedSession(session);
                    PartnerLocationWidgetProvider.render(context);
                    return true;
                }
                if (status != 200) throw new IOException("Doodle request failed");
                JSONObject response = new JSONObject(readAll(connection.getInputStream()));
                store.applyRefresh(session, previousKey, response.optJSONObject("doodle"), clearDrawing);
            } finally {
                connection.disconnect();
            }
            return true;
        } catch (IOException | JSONException e) {
            Log.w(TAG, "Doodle widget refresh failed", e);
            return false;
        }
    }

    private static String readAll(InputStream stream) throws IOException {
        try (InputStream in = stream) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            return out.toString("UTF-8");
        }
    }
}

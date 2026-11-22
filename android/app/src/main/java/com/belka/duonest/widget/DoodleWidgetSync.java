package com.belka.duonest.widget;

import android.content.Context;
import android.util.Log;
import androidx.annotation.Nullable;
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Loads the newest partnership_doodles row while the web app is not running, with the
 * user's own Firebase session, so the same Firestore security rules apply.
 */
final class DoodleWidgetSync {

    private static final String TAG = "DuoWidget";
    private static final int TIMEOUT_MS = 8000;
    private static final long PUSH_DRAWING_MS = 60_000;

    private static String idToken;
    private static String idTokenUid;
    private static long idTokenExpiresAt;

    private DoodleWidgetSync() {}

    /** Data-only FCM message sent by pushCore.ts to the partner's Android devices. */
    static void handlePush(Context context, Map<String, String> data) {
        DoodleWidgetStore store = DoodleWidgetStore.get(context);
        DoodleWidgetStore.Session session = store.session();
        String recipient = data.get("recipientProfileId");
        if (session == null || (!session.profileId.isEmpty() && recipient != null && !recipient.equals(session.profileId))) return;

        String senderName = data.get("senderName");
        if (senderName != null && !senderName.isEmpty()) store.setPartnerName(senderName);

        if ("DOODLE_DRAWING_STATUS".equals(data.get("action"))) {
            store.setPartnerDrawingUntil(System.currentTimeMillis() + PUSH_DRAWING_MS);
            DoodleWidgetProvider.scheduleDrawingExpiry(context, PUSH_DRAWING_MS);
            DoodleWidgetProvider.requestRender(context);
        } else if ("DOODLE_SAVE".equals(data.get("action")) || "DOODLE_CLEAR".equals(data.get("action"))) {
            store.setPartnerDrawingUntil(0);
            DoodleRefreshWorker.enqueue(context);
        }
    }

    static synchronized boolean refresh(Context context) {
        DoodleWidgetStore store = DoodleWidgetStore.get(context);
        DoodleWidgetStore.Session session = store.session();
        if (session == null) {
            return true;
        }
        try {
            String previousKey = store.currentDoodleKey();
            String token = idToken(store, session);
            if (token == null) return true;
            JSONObject doodle = fetchLatestDoodle(session, token);
            store.applyRefresh(session, previousKey, doodle);
            return true;
        } catch (IOException | JSONException e) {
            Log.w(TAG, "Doodle widget refresh failed", e);
            return false;
        }
    }

    @Nullable
    private static String idToken(DoodleWidgetStore store, DoodleWidgetStore.Session session) throws IOException, JSONException {
        if (idToken != null && session.uid.equals(idTokenUid) && System.currentTimeMillis() < idTokenExpiresAt) return idToken;

        String body = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(session.refreshToken, "UTF-8");
        HttpURLConnection connection = open("https://securetoken.googleapis.com/v1/token?key=" + URLEncoder.encode(session.apiKey, "UTF-8"));
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        String appCheck = appCheckToken();
        if (appCheck != null) connection.setRequestProperty("X-Firebase-AppCheck", appCheck);
        Response response = send(connection, body);
        if (response.status == 400 && isRevokedSession(response.body)) {
            // The app hands over a new session at the next sign-in.
            Log.w(TAG, "Widget session revoked");
            if (session.sameAccount(store.session())) store.setSession(null);
            return null;
        }
        if (response.status != 200) throw new IOException("Token refresh HTTP " + response.status);

        JSONObject json = new JSONObject(response.body);
        if (!session.uid.equals(json.optString("user_id"))) return null;
        String refreshToken = json.optString("refresh_token");
        if (!refreshToken.isEmpty()) store.updateRefreshToken(session, refreshToken);

        idToken = json.getString("id_token");
        idTokenUid = session.uid;
        idTokenExpiresAt = System.currentTimeMillis() + Math.max(60, json.optLong("expires_in", 3600) - 300) * 1000L;
        return idToken;
    }

    private static boolean isRevokedSession(String body) {
        try {
            JSONObject error = new JSONObject(body).optJSONObject("error");
            String message = error == null ? "" : error.optString("message");
            return message.startsWith("TOKEN_EXPIRED") || message.startsWith("USER_DISABLED") ||
                message.startsWith("USER_NOT_FOUND") || message.startsWith("INVALID_REFRESH_TOKEN");
        } catch (JSONException e) {
            return false;
        }
    }

    @Nullable
    private static JSONObject fetchLatestDoodle(DoodleWidgetStore.Session session, String token) throws IOException, JSONException {
        JSONObject query = new JSONObject().put("structuredQuery", new JSONObject()
            .put("from", new JSONArray().put(new JSONObject().put("collectionId", "partnership_doodles")))
            .put("where", new JSONObject().put("fieldFilter", new JSONObject()
                .put("field", new JSONObject().put("fieldPath", "partnership_id"))
                .put("op", "EQUAL")
                .put("value", new JSONObject().put("stringValue", session.partnershipId))))
            .put("orderBy", new JSONArray().put(new JSONObject()
                .put("field", new JSONObject().put("fieldPath", "updated_at"))
                .put("direction", "DESCENDING")))
            .put("limit", 1));

        HttpURLConnection connection = open(
            "https://firestore.googleapis.com/v1/projects/" + URLEncoder.encode(session.projectId, "UTF-8") +
            "/databases/(default)/documents:runQuery"
        );
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Authorization", "Bearer " + token);
        String appCheck = appCheckToken();
        if (appCheck != null) connection.setRequestProperty("X-Firebase-AppCheck", appCheck);

        Response response = send(connection, query.toString());
        if (response.status != 200) throw new IOException("Firestore runQuery HTTP " + response.status);

        JSONArray rows = new JSONArray(response.body);
        for (int i = 0; i < rows.length(); i++) {
            JSONObject document = rows.getJSONObject(i).optJSONObject("document");
            if (document != null) return documentToDoodle(document);
        }
        return null;
    }

    private static JSONObject documentToDoodle(JSONObject document) throws JSONException {
        JSONObject fields = document.optJSONObject("fields");
        if (fields == null) fields = new JSONObject();

        JSONArray strokes = new JSONArray();
        for (Object value : arrayValues(fields.optJSONObject("strokes"))) {
            JSONObject strokeFields = mapFields(value);
            if (strokeFields == null) continue;
            JSONArray points = new JSONArray();
            Object[] rawPoints = arrayValues(strokeFields.optJSONObject("points"));
            if (rawPoints.length < 2 || rawPoints.length > 100_000 || rawPoints.length % 2 != 0) continue;
            for (Object point : rawPoints) {
                double coordinate = number(point);
                if (!Double.isFinite(coordinate) || coordinate < 0 || coordinate > 1) break;
                points.put(coordinate);
            }
            double width = number(strokeFields.opt(strokeFields.has("width") ? "width" : "size"));
            if (points.length() != rawPoints.length || !Double.isFinite(width)) continue;
            JSONObject isEraser = strokeFields.optJSONObject("isEraser");
            strokes.put(new JSONObject()
                .put("points", points)
                .put("color", string(strokeFields, "color"))
                .put("width", width)
                .put("isEraser", isEraser != null && isEraser.optBoolean("booleanValue", false)));
        }

        String name = document.optString("name");
        String id = string(fields, "id");
        return new JSONObject()
            .put("id", id.isEmpty() ? name.substring(name.lastIndexOf('/') + 1) : id)
            .put("updated_at", string(fields, "updated_at"))
            .put("author_name", string(fields, "author_name"))
            .put("strokes", strokes);
    }

    private static Object[] arrayValues(@Nullable JSONObject value) {
        JSONObject array = value == null ? null : value.optJSONObject("arrayValue");
        JSONArray values = array == null ? null : array.optJSONArray("values");
        if (values == null) return new Object[0];
        Object[] out = new Object[values.length()];
        for (int i = 0; i < out.length; i++) out[i] = values.opt(i);
        return out;
    }

    @Nullable
    private static JSONObject mapFields(Object value) {
        if (!(value instanceof JSONObject)) return null;
        JSONObject map = ((JSONObject) value).optJSONObject("mapValue");
        return map == null ? null : map.optJSONObject("fields");
    }

    private static String string(JSONObject fields, String key) {
        JSONObject value = fields.optJSONObject(key);
        return value == null ? "" : value.optString("stringValue", "");
    }

    private static double number(Object value) {
        if (!(value instanceof JSONObject)) return Double.NaN;
        JSONObject json = (JSONObject) value;
        if (json.has("doubleValue")) return json.optDouble("doubleValue", Double.NaN);
        if (json.has("integerValue")) {
            try {
                return Double.parseDouble(json.optString("integerValue"));
            } catch (NumberFormatException e) {
                return Double.NaN;
            }
        }
        return Double.NaN;
    }

    /** Firestore may enforce App Check; without a token the request is still sent. */
    @Nullable
    private static String appCheckToken() {
        try {
            FirebaseAppCheck appCheck = FirebaseAppCheck.getInstance();
            try {
                return Tasks.await(appCheck.getAppCheckToken(false), TIMEOUT_MS, TimeUnit.MILLISECONDS).getToken();
            } catch (ExecutionException noProvider) {
                // Process started by FCM or the widget: the web app has not installed a provider yet.
                appCheck.installAppCheckProviderFactory(PlayIntegrityAppCheckProviderFactory.getInstance());
                return Tasks.await(appCheck.getAppCheckToken(false), TIMEOUT_MS, TimeUnit.MILLISECONDS).getToken();
            }
        } catch (Exception e) {
            Log.w(TAG, "App Check token unavailable for the widget", e);
            return null;
        }
    }

    private static final class Response {
        final int status;
        final String body;

        Response(int status, String body) {
            this.status = status;
            this.body = body;
        }
    }

    private static HttpURLConnection open(String url) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(TIMEOUT_MS);
        connection.setReadTimeout(TIMEOUT_MS);
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        return connection;
    }

    private static Response send(HttpURLConnection connection, String body) throws IOException {
        try {
            try (OutputStream out = connection.getOutputStream()) {
                out.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            return new Response(status, stream == null ? "" : readAll(stream));
        } finally {
            connection.disconnect();
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

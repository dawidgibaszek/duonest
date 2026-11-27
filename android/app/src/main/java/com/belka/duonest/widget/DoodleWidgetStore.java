package com.belka.duonest.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.util.AtomicFile;
import android.util.Log;
import androidx.annotation.Nullable;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Widget state shared by the web bridge, FCM and the widget provider. */
final class DoodleWidgetStore {

    private static final String TAG = "DuoWidget";
    private static final String PREFS = "duonest_doodle_widget";
    private static final String PREF_PARTNER_NAME = "partner_name";
    private static final String PREF_DRAWING_UNTIL = "partner_drawing_until";
    private static final String DOODLE_FILE = "doodle_widget.json";
    // Holds the scoped widget credential, so it stays out of Auto Backup.
    private static final String SESSION_FILE = "doodle_widget_session.json";
    private static final String LOCATION_FILE = "partner_location_widget.json";

    static final class Session {
        final String uid;
        final String profileId;
        final String partnershipId;
        final String credential;

        Session(String uid, String profileId, String partnershipId, String credential) {
            this.uid = uid;
            this.profileId = profileId;
            this.partnershipId = partnershipId;
            this.credential = credential;
        }

        Session withCredential(String token) {
            return new Session(uid, profileId, partnershipId, token);
        }

        boolean sameAccount(@Nullable Session other) {
            return other != null && uid.equals(other.uid) && partnershipId.equals(other.partnershipId);
        }

        @Nullable
        static Session fromJson(@Nullable JSONObject json) {
            if (json == null) return null;
            String uid = json.optString("uid");
            String profileId = json.optString("profileId");
            String partnershipId = json.optString("partnershipId");
            if (uid.isEmpty() || partnershipId.isEmpty()) return null;
            return new Session(uid, profileId, partnershipId, json.optString("credential"));
        }

        JSONObject toJson() throws JSONException {
            return new JSONObject()
                .put("uid", uid)
                .put("profileId", profileId)
                .put("partnershipId", partnershipId)
                .put("credential", credential);
        }
    }

    /** What the widget shows at one moment. */
    static final class Snapshot {
        final boolean connected;
        final String partnerName;
        final String authorName;
        final boolean partnerDrawing;
        final List<DoodleStroke> strokes;

        Snapshot(boolean connected, String partnerName, String authorName, boolean partnerDrawing, List<DoodleStroke> strokes) {
            this.connected = connected;
            this.partnerName = partnerName;
            this.authorName = authorName;
            this.partnerDrawing = partnerDrawing;
            this.strokes = strokes;
        }
    }

    private static DoodleWidgetStore instance;

    static synchronized DoodleWidgetStore get(Context context) {
        if (instance == null) instance = new DoodleWidgetStore(context.getApplicationContext());
        return instance;
    }

    private final Context context;
    private final SharedPreferences prefs;
    @Nullable
    private Session session;
    @Nullable private PartnerLocation partnerLocation;
    @Nullable private Bitmap partnerLocationMap;
    private String doodleKey = "";
    private String updatedAt = "";
    private String authorName = "";
    private List<DoodleStroke> strokes = Collections.emptyList();
    private final List<DoodleStroke> liveStrokes = new ArrayList<>();

    private DoodleWidgetStore(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject savedSession = readJson(sessionFile());
        this.session = Session.fromJson(savedSession);
        if (savedSession != null && savedSession.has("refreshToken")) {
            if (session == null) new AtomicFile(sessionFile()).delete();
            else writeJson(sessionFile(), session::toJson);
        }
        JSONObject cached = readJson(locationFile());
        if (session != null && !session.credential.isEmpty() && cached != null &&
            session.uid.equals(cached.optString("uid")) && session.partnershipId.equals(cached.optString("partnershipId"))) {
            partnerLocation = PartnerLocation.fromJson(cached.optJSONObject("location"));
        }
        if (session != null && !session.credential.isEmpty()) applyDoodle(readJson(doodleFile()));
        else new AtomicFile(doodleFile()).delete();
    }

    @Nullable
    synchronized Session session() {
        return session;
    }

    /** {@code null} signs the widget out and forgets the cached doodle. */
    synchronized void setSession(@Nullable Session next) {
        if (next == null) {
            session = null;
            clearPartnerLocation();
            strokes = Collections.emptyList();
            liveStrokes.clear();
            doodleKey = "";
            updatedAt = "";
            authorName = "";
            new AtomicFile(sessionFile()).delete();
            doodleFile().delete();
            prefs.edit().clear().apply();
            return;
        }
        boolean sameAccount = next.sameAccount(session);
        if (!sameAccount || !next.credential.equals(session.credential)) clearPartnerLocation();
        if (!sameAccount) {
            applyDoodle(null);
            doodleFile().delete();
        }
        session = next;
        writeJson(sessionFile(), next::toJson);
    }

    synchronized void setAppSession(@Nullable Session next, String name) {
        if (next != null && next.sameAccount(session) && next.credential.isEmpty()) {
            next = next.withCredential(session.credential);
        }
        setSession(next);
        if (next != null) setPartnerName(name);
    }

    synchronized boolean hasLocationAccess(String uid, String partnershipId) {
        return session != null && uid.equals(session.uid) && partnershipId.equals(session.partnershipId) &&
            !session.credential.isEmpty();
    }

    @Nullable
    synchronized PartnerLocation partnerLocation() {
        if (partnerLocation != null && partnerLocation.expiresAt <= System.currentTimeMillis()) clearPartnerLocation();
        return partnerLocation;
    }

    @Nullable
    synchronized Bitmap partnerLocationMap() {
        return partnerLocationMap;
    }

    @Nullable
    synchronized Bitmap mapForLocation(Session expected, PartnerLocation location) {
        return sameLocationSession(expected) && location.sameMapArea(partnerLocation()) ? partnerLocationMap : null;
    }

    synchronized void restoreLocationMap(Session expected, PartnerLocation location, Bitmap map) {
        if (sameLocationSession(expected) && location.sameMapArea(partnerLocation()) && partnerLocationMap == null) {
            partnerLocationMap = map;
        }
    }

    synchronized boolean sameLocationSession(Session expected) {
        return expected.sameAccount(session) && expected.credential.equals(session.credential);
    }

    synchronized void setPartnerLocation(Session expected, @Nullable JSONObject response, boolean revokeAccess, @Nullable Bitmap map) {
        if (!sameLocationSession(expected)) return;
        if (revokeAccess) {
            setSession(null);
            return;
        }
        JSONObject rawLocation = response == null ? null : response.optJSONObject("location");
        if (response != null && response.has("partnerName")) setPartnerName(response.optString("partnerName"));
        PartnerLocation nextLocation = PartnerLocation.fromJson(rawLocation);
        if (nextLocation == null) {
            clearPartnerLocation();
        } else {
            if (!nextLocation.sameMapArea(partnerLocation) || (map != null && map != partnerLocationMap)) {
                partnerLocationMap = map;
            }
            partnerLocation = nextLocation;
            writeJson(locationFile(), () -> new JSONObject().put("uid", expected.uid)
                .put("partnershipId", expected.partnershipId).put("location", rawLocation));
        }
    }

    synchronized String partnerName() {
        return prefs.getString(PREF_PARTNER_NAME, "");
    }

    private void clearPartnerLocation() {
        partnerLocation = null;
        partnerLocationMap = null;
        new AtomicFile(locationFile()).delete();
    }

    synchronized void clearRevokedSession(Session expected) {
        if (sameLocationSession(expected)) setSession(null);
    }

    synchronized String currentDoodleKey() {
        return doodleKey;
    }

    synchronized boolean hasDoodleId(@Nullable String id) {
        return id != null && !id.isEmpty() && doodleKey.startsWith(id + "@");
    }

    synchronized void finishPartnerDrawing() {
        liveStrokes.clear();
        setPartnerDrawingUntil(0);
    }

    synchronized void applyRefresh(Session account, String previousKey, @Nullable JSONObject doodle, boolean clearDrawing) {
        if (!sameLocationSession(account)) return;
        if (clearDrawing) {
            liveStrokes.clear();
            setPartnerDrawingUntil(0);
        }
        if (doodle == null) {
            if (previousKey.equals(doodleKey)) setDoodle(null);
            return;
        }
        String incomingUpdatedAt = doodle.optString("updated_at");
        if (previousKey.equals(doodleKey) || isNewerTimestamp(incomingUpdatedAt, updatedAt)) {
            setDoodle(doodle);
        }
    }

    synchronized void setPartnerName(String name) {
        prefs.edit().putString(PREF_PARTNER_NAME, name).apply();
    }

    /** Accepts a partnership_doodles row ({@code null} when the board is empty). */
    synchronized boolean setDoodle(@Nullable JSONObject doodle) {
        if (doodle != null) {
            String incomingUpdatedAt = doodle.optString("updated_at");
            if (!updatedAt.isEmpty() && !incomingUpdatedAt.isEmpty() && incomingUpdatedAt.compareTo(updatedAt) < 0) {
                return false;
            }
        }
        boolean changed = applyDoodle(doodle);
        if (doodle == null) {
            doodleFile().delete();
        } else {
            writeJson(doodleFile(), () -> serializeDoodle());
        }
        return changed;
    }

    synchronized void addLiveStroke(DoodleStroke stroke) {
        for (int i = liveStrokes.size() - 1; i >= 0; i--) {
            if (liveStrokes.get(i).isContinuedBy(stroke)) {
                liveStrokes.set(i, stroke);
                return;
            }
        }
        liveStrokes.add(stroke);
    }

    synchronized void clearLiveStrokes() {
        liveStrokes.clear();
    }

    synchronized void setPartnerDrawingUntil(long untilMillis) {
        prefs.edit().putLong(PREF_DRAWING_UNTIL, untilMillis).apply();
    }

    synchronized long partnerDrawingUntil() {
        return prefs.getLong(PREF_DRAWING_UNTIL, 0);
    }

    synchronized Snapshot snapshot() {
        List<DoodleStroke> all = new ArrayList<>(strokes.size() + liveStrokes.size());
        all.addAll(strokes);
        all.addAll(liveStrokes);
        return new Snapshot(
            session != null,
            prefs.getString(PREF_PARTNER_NAME, ""),
            authorName,
            System.currentTimeMillis() < partnerDrawingUntil(),
            all
        );
    }

    private boolean applyDoodle(@Nullable JSONObject doodle) {
        String nextUpdatedAt = doodle == null ? "" : doodle.optString("updated_at");
        String nextKey = doodle == null ? "" : doodle.optString("id") + "@" + nextUpdatedAt;
        boolean keyChanged = !nextKey.equals(doodleKey);
        doodleKey = nextKey;
        updatedAt = nextUpdatedAt;
        authorName = doodle == null ? "" : doodle.optString("author_name");

        List<DoodleStroke> parsed = new ArrayList<>();
        JSONArray rawStrokes = doodle == null ? null : doodle.optJSONArray("strokes");
        if (rawStrokes != null) {
            for (int i = 0; i < rawStrokes.length(); i++) {
                DoodleStroke stroke = DoodleStroke.fromJson(rawStrokes.optJSONObject(i));
                if (stroke != null) parsed.add(stroke);
            }
        }
        strokes = parsed;

        if (doodle == null || System.currentTimeMillis() >= partnerDrawingUntil()) {
            liveStrokes.clear();
        } else if (keyChanged && !liveStrokes.isEmpty()) {
            liveStrokes.removeIf(live -> {
                for (DoodleStroke saved : parsed) {
                    if (live.isContinuedBy(saved) || saved.equals(live)) return true;
                }
                return false;
            });
        }
        return keyChanged;
    }

    private static boolean isNewerTimestamp(String incoming, String existing) {
        if (incoming.isEmpty()) return false;
        if (existing.isEmpty()) return true;
        return incoming.compareTo(existing) > 0;
    }

    private JSONObject serializeDoodle() throws JSONException {
        int split = doodleKey.lastIndexOf('@');
        JSONArray jsonStrokes = new JSONArray();
        for (DoodleStroke stroke : strokes) jsonStrokes.put(stroke.toJson());
        return new JSONObject()
            .put("id", split < 0 ? "" : doodleKey.substring(0, split))
            .put("updated_at", split < 0 ? "" : doodleKey.substring(split + 1))
            .put("author_name", authorName)
            .put("strokes", jsonStrokes);
    }

    private File doodleFile() {
        return new File(context.getFilesDir(), DOODLE_FILE);
    }

    private File sessionFile() {
        return new File(context.getNoBackupFilesDir(), SESSION_FILE);
    }

    private File locationFile() {
        return new File(context.getNoBackupFilesDir(), LOCATION_FILE);
    }

    private interface JsonSupplier {
        JSONObject get() throws JSONException;
    }

    private static void writeJson(File file, JsonSupplier supplier) {
        AtomicFile atomic = new AtomicFile(file);
        FileOutputStream out = null;
        try {
            byte[] bytes = supplier.get().toString().getBytes(StandardCharsets.UTF_8);
            out = atomic.startWrite();
            out.write(bytes);
            atomic.finishWrite(out);
        } catch (IOException | JSONException e) {
            if (out != null) atomic.failWrite(out);
            Log.w(TAG, "Could not persist widget state", e);
        }
    }

    @Nullable
    private static JSONObject readJson(File file) {
        if (!file.exists()) return null;
        try {
            return new JSONObject(new String(new AtomicFile(file).readFully(), StandardCharsets.UTF_8));
        } catch (IOException | JSONException e) {
            Log.w(TAG, "Could not read widget state", e);
            return null;
        }
    }
}

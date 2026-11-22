package com.belka.duonest;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.os.SystemClock;
import android.view.FrameMetrics;
import android.view.Window;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "DuoAndroidDiagnostics")
public final class DuoAndroidDiagnosticsPlugin extends Plugin {
    private static final int QUEUE_LIMIT = 24;
    private static final int BATCH_LIMIT = 8;
    private static final long MAX_EXIT_AGE_MS = 7 * 86_400_000L;
    private static final AtomicBoolean REPORTED_STARTUP = new AtomicBoolean();
    private final Object lock = new Object();
    private final long uiStartedAt = SystemClock.uptimeMillis();
    private SharedPreferences preferences;
    private String version;
    private String build;
    private boolean enabled;
    private int frames;
    private int slowFrames;
    private int frozenFrames;
    private int missedSamples;
    private long startupMs;
    private long foregroundStarted;
    private long foregroundMs;

    private final Window.OnFrameMetricsAvailableListener frameListener = (window, metrics, dropped) -> {
        synchronized (lock) {
            if (!enabled || foregroundStarted == 0 || frames >= 1_000_000) return;
            long duration = metrics.getMetric(FrameMetrics.TOTAL_DURATION);
            if (duration < 0) return;
            frames++;
            if (duration >= 50_000_000L) slowFrames++;
            if (duration >= 700_000_000L) frozenFrames++;
            missedSamples = Math.min(1_000_000, missedSamples + Math.max(0, dropped));
        }
    };

    @Override
    public void load() {
        Context context = getContext();
        preferences = context.getSharedPreferences("duo_android_diagnostics", Context.MODE_PRIVATE);
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            version = info.versionName;
            build = String.valueOf(Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode);
        } catch (PackageManager.NameNotFoundException ignored) {
            return;
        }
        if (version == null) return;
        synchronized (lock) {
            enabled = preferences.getBoolean("enabled", true);
            String release = version + ":" + build;
            if (!release.equals(preferences.getString("release", ""))) {
                // Process exit records have no version. Only attribute exits observed within this release.
                preferences.edit().putString("release", release)
                    .putLong("exitCursor", processStartedAt()).apply();
            }
        }
        getActivity().getWindow().addOnFrameMetricsAvailableListener(frameListener, new Handler(Looper.getMainLooper()));
    }

    @Override
    protected void handleOnResume() {
        synchronized (lock) {
            if (enabled) foregroundStarted = SystemClock.elapsedRealtime();
        }
    }

    @Override
    protected void handleOnPause() {
        synchronized (lock) {
            if (enabled) {
                accumulateForeground();
                JSONArray reports = readQueue();
                if (appendMetrics(reports, true)) saveQueue(reports);
            }
            foregroundStarted = 0;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (version != null) getActivity().getWindow().removeOnFrameMetricsAvailableListener(frameListener);
    }

    @PluginMethod
    public void getState(PluginCall call) {
        synchronized (lock) {
            call.resolve(new JSObject().put("enabled", enabled));
        }
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean next = call.getBoolean("enabled");
        if (next == null || version == null) {
            call.reject("Missing diagnostics preference");
            return;
        }
        synchronized (lock) {
            if (next != enabled) {
                SharedPreferences.Editor change = preferences.edit().putBoolean("enabled", next)
                    .putLong("exitCursor", System.currentTimeMillis());
                if (!next) change.remove("queue");
                if (!change.commit()) {
                    call.reject("Could not save diagnostics preference");
                    return;
                }
                resetMetrics();
                enabled = next;
                foregroundStarted = next ? SystemClock.elapsedRealtime() : 0;
            }
            call.resolve();
        }
    }

    @PluginMethod
    public void markReady(PluginCall call) {
        synchronized (lock) {
            if (REPORTED_STARTUP.compareAndSet(false, true) && enabled) {
                startupMs = Math.min(600_000L, Math.max(1L, SystemClock.uptimeMillis() - uiStartedAt));
            }
            call.resolve();
        }
    }

    @PluginMethod
    public void getReports(PluginCall call) {
        synchronized (lock) {
            JSArray batch = new JSArray();
            if (!enabled) {
                call.resolve(new JSObject().put("reports", batch));
                return;
            }
            JSONArray reports = readQueue();
            accumulateForeground();
            boolean addedMetrics = appendMetrics(reports, false);
            long newExitCursor = appendExits(reports);
            SharedPreferences.Editor changed = preferences.edit();
            if (addedMetrics || newExitCursor >= 0) {
                changed.putString("queue", bounded(reports).toString());
                if (newExitCursor >= 0) changed.putLong("exitCursor", newExitCursor);
                if (!changed.commit()) {
                    call.reject("Could not persist diagnostics queue");
                    return;
                }
                reports = bounded(reports);
            }
            for (int i = 0; i < Math.min(reports.length(), BATCH_LIMIT); i++) batch.put(reports.opt(i));
            call.resolve(new JSObject().put("reports", batch));
        }
    }

    @PluginMethod
    public void acknowledge(PluginCall call) {
        JSArray ids = call.getArray("ids");
        if (ids == null) {
            call.reject("Missing diagnostics report IDs");
            return;
        }
        synchronized (lock) {
            if (!enabled) {
                call.resolve();
                return;
            }
            Set<String> accepted = new HashSet<>();
            for (int i = 0; i < ids.length(); i++) accepted.add(ids.optString(i));
            JSONArray current = readQueue();
            JSONArray remaining = new JSONArray();
            for (int i = 0; i < current.length(); i++) {
                JSONObject item = current.optJSONObject(i);
                if (item != null && !accepted.contains(item.optString("id"))) remaining.put(item);
            }
            if (!preferences.edit().putString("queue", remaining.toString()).commit()) {
                call.reject("Could not acknowledge diagnostics");
                return;
            }
            call.resolve();
        }
    }

    private void accumulateForeground() {
        if (foregroundStarted == 0) return;
        long now = SystemClock.elapsedRealtime();
        foregroundMs += now - foregroundStarted;
        foregroundStarted = now;
    }

    private boolean appendMetrics(JSONArray reports, boolean isBackgrounding) {
        if (startupMs == 0 && foregroundMs < 5_000 && !(isBackgrounding && frames > 0)) return false;
        JSObject values = new JSObject();
        values.put("foregroundSeconds", Math.min(172_800, foregroundMs / 1000));
        if (frames > 0) {
            values.put("frames", frames);
            values.put("slowFrames", slowFrames);
            values.put("frozenFrames", frozenFrames);
            values.put("missedFrameSamples", missedSamples);
        }
        if (startupMs > 0) values.put("startupMs", startupMs);
        reports.put(report("metrics", values, System.currentTimeMillis()));
        resetMetrics();
        return true;
    }

    private long appendExits(JSONArray reports) {
        if (Build.VERSION.SDK_INT < 30) return -1;
        ActivityManager manager = getContext().getSystemService(ActivityManager.class);
        if (manager == null) return -1;
        long cursor = preferences.getLong("exitCursor", System.currentTimeMillis());
        long latest = cursor;
        Map<String, JSObject> grouped = new LinkedHashMap<>();
        try {
            for (ApplicationExitInfo exit : manager.getHistoricalProcessExitReasons(null, 0, 30)) {
                long timestamp = exit.getTimestamp();
                if (timestamp <= cursor || timestamp < System.currentTimeMillis() - MAX_EXIT_AGE_MS) continue;
                latest = Math.max(latest, timestamp);
                String metric;
                switch (exit.getReason()) {
                    case ApplicationExitInfo.REASON_CRASH:
                    case ApplicationExitInfo.REASON_CRASH_NATIVE: metric = "crashes"; break;
                    case ApplicationExitInfo.REASON_ANR: metric = "anrs"; break;
                    case ApplicationExitInfo.REASON_LOW_MEMORY: metric = "lowMemoryExits"; break;
                    default: continue;
                }
                String day = reportDay(timestamp);
                JSObject counts = grouped.computeIfAbsent(day, key -> new JSObject());
                counts.put(metric, counts.optInt(metric) + 1);
            }
        } catch (RuntimeException unavailable) {
            return -1;
        }
        grouped.forEach((day, counts) -> reports.put(report("diagnostics", counts, day)));
        return latest > cursor ? latest : -1;
    }

    private JSObject report(String kind, JSObject values, long timestamp) {
        return report(kind, values, reportDay(timestamp));
    }

    private static String reportDay(long timestamp) {
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
        return formatter.format(new Date(timestamp));
    }

    private JSObject report(String kind, JSObject values, String day) {
        return new JSObject().put("id", UUID.randomUUID().toString())
            .put("day", day)
            .put("version", version).put("build", build).put("kind", kind).put("values", values);
    }

    private void resetMetrics() {
        frames = slowFrames = frozenFrames = missedSamples = 0;
        startupMs = foregroundMs = 0;
    }

    private JSONArray readQueue() {
        try {
            return new JSONArray(preferences.getString("queue", "[]"));
        } catch (JSONException ignored) {
            return new JSONArray();
        }
    }

    private static JSONArray bounded(JSONArray reports) {
        if (reports.length() <= QUEUE_LIMIT) return reports;
        JSONArray recent = new JSONArray();
        for (int i = reports.length() - QUEUE_LIMIT; i < reports.length(); i++) recent.put(reports.opt(i));
        return recent;
    }

    private void saveQueue(JSONArray reports) {
        preferences.edit().putString("queue", bounded(reports).toString()).apply();
    }

    private static long processStartedAt() {
        return System.currentTimeMillis() - (SystemClock.uptimeMillis() - Process.getStartUptimeMillis());
    }
}

package com.belka.duonest;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

public final class DuoLocationService extends Service implements LocationListener {
    private static final String CHANNEL = "duonest_location";
    static volatile boolean running;
    static final String TOKEN = "duonest.location.token";
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private LocationManager manager;
    private volatile String token;
    private boolean listening;
    private long lastSent = -20_000;

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String updatedToken = intent == null ? null : intent.getStringExtra(TOKEN);
        if (updatedToken == null || updatedToken.isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        token = updatedToken;
        manager = getSystemService(LocationManager.class);
        try {
            startForeground(4169, notification());
            if (!listening) {
                for (String provider : providers(this, manager)) {
                    manager.requestLocationUpdates(provider, 15_000, 25f, this, Looper.getMainLooper());
                    Location last = manager.getLastKnownLocation(provider);
                    if (last != null) onLocationChanged(last);
                    listening = true;
                }
            }
            running = listening;
            if (!listening) stopSelf();
        } catch (RuntimeException error) {
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private Notification notification() {
        if (Build.VERSION.SDK_INT >= 26) {
            getSystemService(NotificationManager.class).createNotificationChannel(
                new NotificationChannel(CHANNEL, getString(R.string.duo_location_channel), NotificationManager.IMPORTANCE_LOW)
            );
        }
        PendingIntent launch = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_duonest)
            .setContentTitle(getString(R.string.duo_location_notification))
            .setContentText(getString(R.string.duo_location_notification_info))
            .setContentIntent(launch).setOngoing(true).setOnlyAlertOnce(true).build();
    }

    static List<String> providers(Context context, LocationManager manager) {
        List<String> available = new java.util.ArrayList<>();
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            && manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) available.add(LocationManager.GPS_PROVIDER);
        if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) available.add(LocationManager.NETWORK_PROVIDER);
        return available;
    }

    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}
    @Override public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}

    @Override public void onLocationChanged(Location fix) {
        String current = token;
        long now = SystemClock.elapsedRealtime();
        if (current == null || !fix.hasAccuracy() || Math.abs(System.currentTimeMillis() - fix.getTime()) > 60_000 || now - lastSent < 18_000) return;
        lastSent = now;
        worker.execute(() -> {
            JSONObject payload = payload(this, fix);
            if (current.equals(token) && send(current, payload) == 401 && current.equals(token)) stopSelf();
        });
    }

    static JSONObject payload(Context context, Location fix) {
        JSONObject result = new JSONObject();
        JSONObject address = new JSONObject();
        try {
            result.put("latitude", fix.getLatitude());
            result.put("longitude", fix.getLongitude());
            result.put("accuracy", fix.hasAccuracy() ? fix.getAccuracy() : 0);
            result.put("captured_at", fix.getTime());
            result.put("address", address);
            if (Geocoder.isPresent()) {
                List<Address> places = new Geocoder(context, Locale.forLanguageTag("pl-PL"))
                    .getFromLocation(fix.getLatitude(), fix.getLongitude(), 1);
                if (places != null && !places.isEmpty()) {
                    Address place = places.get(0);
                    address.putOpt("street", place.getThoroughfare());
                    address.putOpt("number", place.getSubThoroughfare());
                    address.putOpt("city", place.getLocality() != null ? place.getLocality() : place.getSubAdminArea());
                    address.putOpt("country", place.getCountryName());
                }
            }
        } catch (Exception ignored) {
            // Coordinates can still be used when the geocoder has no network or address.
        }
        return result;
    }

    private int send(String current, JSONObject body) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL("https://duonestapp.pl/api/location/update").openConnection();
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(10_000);
            connection.setRequestMethod("POST");
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Authorization", "Bearer " + current);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);
            try (java.io.OutputStream stream = connection.getOutputStream()) {
                stream.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            return connection.getResponseCode();
        } catch (Exception ignored) {
            return 0;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        running = false;
        token = null;
        if (manager != null) {
            try { manager.removeUpdates(this); } catch (SecurityException ignored) {}
        }
        worker.shutdownNow();
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}

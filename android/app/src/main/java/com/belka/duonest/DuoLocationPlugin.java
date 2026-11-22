package com.belka.duonest;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "DuoLocation", permissions = {
    @Permission(alias = "location", strings = {Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}),
    @Permission(alias = "approximate", strings = {Manifest.permission.ACCESS_COARSE_LOCATION})
})
public final class DuoLocationPlugin extends Plugin {
    @PluginMethod public void start(PluginCall call) { withPermission(call); }
    @PluginMethod public void locate(PluginCall call) { withPermission(call); }

    @PluginMethod public void status(PluginCall call) {
        call.resolve(new JSObject().put("active", DuoLocationService.running));
    }

    @PluginMethod public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), DuoLocationService.class));
        call.resolve();
    }

    @PluginMethod public void navigate(PluginCall call) {
        Double latitude = call.getDouble("latitude");
        Double longitude = call.getDouble("longitude");
        if (latitude == null || longitude == null || !Double.isFinite(latitude) || !Double.isFinite(longitude)
            || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            call.reject("Brak celu nawigacji.");
            return;
        }
        String destination = latitude + "," + longitude;
        getActivity().runOnUiThread(() -> {
            try {
                try {
                    getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=" + destination)));
                } catch (ActivityNotFoundException error) {
                    Uri route = Uri.parse("https://www.google.com/maps/dir/").buildUpon()
                        .appendQueryParameter("api", "1")
                        .appendQueryParameter("destination", destination)
                        .build();
                    getActivity().startActivity(new Intent(Intent.ACTION_VIEW, route));
                }
                call.resolve();
            } catch (ActivityNotFoundException error) {
                call.reject("Nie udało się otworzyć aplikacji z mapami.");
            }
        });
    }

    private void withPermission(PluginCall call) {
        if (getPermissionState("approximate") == PermissionState.GRANTED) locationPermission(call);
        else requestPermissionForAlias("location", call, "locationPermission");
    }

    @PermissionCallback
    private void locationPermission(PluginCall call) {
        if (getPermissionState("approximate") != PermissionState.GRANTED) {
            call.reject("Włącz dostęp do lokalizacji w ustawieniach telefonu.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            LocationManager manager = getContext().getSystemService(LocationManager.class);
            List<String> providers = DuoLocationService.providers(getContext(), manager);
            if (providers.isEmpty()) {
                call.reject("Włącz usługi lokalizacji w ustawieniach telefonu.");
                return;
            }
            try {
                if ("start".equals(call.getMethodName())) {
                    String token = call.getString("token");
                    if (token == null || token.isEmpty()) { call.reject("Brak sesji udostępniania."); return; }
                    ContextCompat.startForegroundService(getContext(),
                        new Intent(getContext(), DuoLocationService.class).putExtra(DuoLocationService.TOKEN, token));
                    call.resolve();
                } else {
                    locateOnce(call, manager, providers);
                }
            } catch (RuntimeException error) {
                call.reject("Nie udało się uruchomić dostępu do lokalizacji.");
            }
        });
    }

    private void locateOnce(PluginCall call, LocationManager manager, List<String> providers) {
        AtomicBoolean completed = new AtomicBoolean();
        LocationListener listener = new LocationListener() {
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onProviderDisabled(String provider) {}
            @Override public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}

            @Override public void onLocationChanged(Location fix) {
                if (!completed.compareAndSet(false, true)) return;
                manager.removeUpdates(this);
                new Thread(() -> {
                    try { call.resolve(JSObject.fromJSONObject(DuoLocationService.payload(getContext(), fix))); }
                    catch (Exception error) { call.reject("Nie udało się odczytać lokalizacji."); }
                }).start();
            }
        };
        try {
            for (String provider : providers) {
                manager.requestLocationUpdates(provider, 0, 0, listener, Looper.getMainLooper());
            }
        } catch (RuntimeException error) {
            completed.set(true);
            manager.removeUpdates(listener);
            throw error;
        }
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (completed.compareAndSet(false, true)) {
                manager.removeUpdates(listener);
                call.reject("Nie udało się ustalić pozycji.");
            }
        }, 15_000);
    }
}

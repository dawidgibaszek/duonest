package com.belka.duonest;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMapOptions;
import com.google.android.gms.maps.MapView;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.MarkerOptions;
import java.io.ByteArrayOutputStream;

@CapacitorPlugin(name = "DuoGoogleMapPreview")
public final class DuoGoogleMapPreviewPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MapView mapView;
    private PluginCall pendingCall;
    private Runnable timeout;
    private boolean mapStarted;

    @PluginMethod
    public void snapshot(PluginCall call) {
        JSObject partner = call.getObject("partner");
        Double width = call.getDouble("width");
        Double height = call.getDouble("height");
        double latitude = partner == null ? Double.NaN : partner.optDouble("latitude", Double.NaN);
        double longitude = partner == null ? Double.NaN : partner.optDouble("longitude", Double.NaN);
        if (width == null || height == null || !Double.isFinite(width) || !Double.isFinite(height)
            || width <= 0 || height <= 0 || !Double.isFinite(latitude) || !Double.isFinite(longitude)
            || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            call.reject("Nieprawidłowe dane podglądu mapy.");
            return;
        }
        String icon = call.getString("icon", "");
        float density = getContext().getResources().getDisplayMetrics().density;
        int widthPx = Math.max(1, Math.min(1200, Math.round(width.floatValue() * density)));
        int heightPx = Math.max(1, Math.min(600, Math.round(height.floatValue() * density)));
        getActivity().runOnUiThread(() -> startSnapshot(call, new LatLng(latitude, longitude), icon, widthPx, heightPx));
    }

    private void startSnapshot(PluginCall call, LatLng coordinate, String icon, int width, int height) {
        cancelPending();
        pendingCall = call;
        View webView = getBridge().getWebView();
        if (!(webView.getParent() instanceof ViewGroup)) {
            fail(call);
            return;
        }
        try {
            // The SDK needs an attached MapView to load tiles. Keep it below the
            // opaque WebView and return only its snapshot to the visible card.
            MapView view = new MapView(getActivity(), new GoogleMapOptions().liteMode(true));
            view.onCreate(null);
            mapView = view;
            ((ViewGroup) webView.getParent()).addView(view, 0, new ViewGroup.LayoutParams(width, height));
            view.onStart();
            view.onResume();
            mapStarted = true;
            timeout = () -> fail(call);
            handler.postDelayed(timeout, 12_000);
            view.getMapAsync(map -> {
                if (pendingCall != call) return;
                try {
                    map.getUiSettings().setAllGesturesEnabled(false);
                    map.addMarker(new MarkerOptions().position(coordinate)
                        .anchor(0.5f, 0.5f)
                        .icon(BitmapDescriptorFactory.fromBitmap(marker(icon))));
                    map.moveCamera(CameraUpdateFactory.newLatLngZoom(coordinate, 16));
                    map.setOnMapLoadedCallback(() -> {
                        if (pendingCall != call) return;
                        try {
                            map.snapshot(bitmap -> {
                                if (pendingCall != call) return;
                                if (bitmap == null) {
                                    fail(call);
                                    return;
                                }
                                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                                if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 82, bytes)) {
                                    fail(call);
                                    return;
                                }
                                String image = "data:image/jpeg;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP);
                                cleanup();
                                call.resolve(new JSObject().put("image", image));
                            });
                        } catch (RuntimeException error) {
                            fail(call);
                        }
                    });
                } catch (RuntimeException error) {
                    fail(call);
                }
            });
        } catch (RuntimeException error) {
            fail(call);
        }
    }

    private Bitmap marker(String icon) {
        String prefix = "data:image/png;base64,";
        if (!icon.startsWith(prefix)) throw new IllegalArgumentException("Invalid marker image");
        byte[] bytes = Base64.decode(icon.substring(prefix.length()), Base64.DEFAULT);
        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) throw new IllegalArgumentException("Invalid marker image");
        int size = Math.round(44 * getContext().getResources().getDisplayMetrics().density);
        return Bitmap.createScaledBitmap(bitmap, size, size, true);
    }

    @PluginMethod
    public void setMarkers(PluginCall call) {
        String id = call.getString("id");
        JSONArray points = call.getArray("points");
        getActivity().runOnUiThread(() -> {
            // Capacitor Google Maps tags the FrameLayout containing each MapView with its map id.
            ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
            ViewGroup container = parent.findViewWithTag(id);
            if (container == null || !(container.getChildAt(0) instanceof MapView) || points == null) {
                call.reject("Mapa jest niedost?pna.");
                return;
            }
            ((MapView) container.getChildAt(0)).getMapAsync(map -> {
                try {
                    List<MarkerOptions> markers = new ArrayList<>();
                    for (int i = 0; i < points.length(); i++) {
                        JSONObject point = points.getJSONObject(i);
                        markers.add(new MarkerOptions()
                            .position(new LatLng(point.getDouble("latitude"), point.getDouble("longitude")))
                            .title(point.getString("name")).anchor(0.5f, 0.5f)
                            .icon(BitmapDescriptorFactory.fromBitmap(marker(point.getString("icon")))));
                    }
                    map.clear();
                    for (MarkerOptions options : markers) map.addMarker(options);
                    call.resolve();
                } catch (Exception error) {
                    call.reject("Nie uda?o si? wy?wietli? znacznik?w.", error);
                }
            });
        });
    }

    private void fail(PluginCall call) {
        if (pendingCall != call) return;
        cleanup();
        call.reject("Podgląd mapy jest chwilowo niedostępny.");
    }

    private void cancelPending() {
        PluginCall call = pendingCall;
        cleanup();
        if (call != null) call.reject("Podgląd mapy został zastąpiony.");
    }

    private void cleanup() {
        pendingCall = null;
        if (timeout != null) handler.removeCallbacks(timeout);
        timeout = null;
        MapView view = mapView;
        mapView = null;
        if (view == null) return;
        if (mapStarted) {
            view.onPause();
            view.onStop();
        }
        mapStarted = false;
        view.onDestroy();
        if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
    }

    @Override
    protected void handleOnPause() {
        getActivity().runOnUiThread(this::cancelPending);
    }

    @Override
    protected void handleOnDestroy() {
        getActivity().runOnUiThread(this::cancelPending);
    }
}

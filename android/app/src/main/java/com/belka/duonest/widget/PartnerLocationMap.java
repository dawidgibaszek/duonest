package com.belka.duonest.widget;

import android.app.Presentation;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.ImageReader;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.WindowManager;
import androidx.annotation.Nullable;
import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMapOptions;
import com.google.android.gms.maps.MapView;
import com.google.android.gms.maps.model.LatLng;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/** Gives the Google Maps SDK an attached window on a private, off-screen display. */
final class PartnerLocationMap {
    private static final int SIZE = 360;

    @Nullable
    static Bitmap snapshot(Context context, PartnerLocation location) {
        Capture capture = new Capture(context);
        capture.main.post(() -> capture.start(location));
        try {
            return capture.result.get(12, TimeUnit.SECONDS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
        } catch (ExecutionException | TimeoutException ignored) {
            Log.w("DuoWidget", "Google Maps widget snapshot timed out");
        } finally {
            capture.result.complete(null);
            capture.main.post(capture::close);
        }
        return null;
    }

    private static final class Capture {
        final Handler main = new Handler(Looper.getMainLooper());
        final CompletableFuture<Bitmap> result = new CompletableFuture<>();
        private final Context context;
        private ImageReader reader;
        private VirtualDisplay display;
        private Presentation presentation;
        private MapView mapView;
        private boolean resumed;

        Capture(Context context) {
            this.context = context.getApplicationContext();
        }

        void start(PartnerLocation location) {
            if (result.isDone()) return;
            try {
                reader = ImageReader.newInstance(SIZE, SIZE, PixelFormat.RGBA_8888, 2);
                reader.setOnImageAvailableListener(source -> {
                    if (result.isDone()) return;
                    try (android.media.Image ignored = source.acquireLatestImage()) {
                        // Drain the private display surface so the SDK can keep rendering.
                    }
                }, main);
                display = context.getSystemService(DisplayManager.class).createVirtualDisplay(
                    "DuoNest Google Maps", SIZE, SIZE, 160, reader.getSurface(),
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY);
                if (display == null) {
                    result.complete(null);
                    return;
                }
                presentation = new Presentation(context, display.getDisplay());
                presentation.getWindow().addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE);
                presentation.getWindow().setBackgroundDrawableResource(android.R.color.white);
                mapView = new MapView(presentation.getContext(), new GoogleMapOptions().liteMode(true));
                mapView.onCreate(null);
                presentation.setContentView(mapView);
                presentation.show();
                presentation.getWindow().setLayout(SIZE, SIZE);
                mapView.onStart();
                mapView.onResume();
                resumed = true;
                mapView.getMapAsync(map -> {
                    if (result.isDone()) return;
                    try {
                        map.getUiSettings().setAllGesturesEnabled(false);
                        map.getUiSettings().setMapToolbarEnabled(false);
                        map.moveCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(location.latitude, location.longitude), 14));
                        map.setOnMapLoadedCallback(() -> {
                            if (!result.isDone()) {
                                try {
                                    map.snapshot(result::complete);
                                } catch (RuntimeException error) {
                                    fail(error);
                                }
                            }
                        });
                    } catch (RuntimeException error) {
                        fail(error);
                    }
                });
            } catch (RuntimeException error) {
                fail(error);
            }
        }

        void close() {
            try {
                if (mapView != null) {
                    if (resumed) {
                        mapView.onPause();
                        mapView.onStop();
                    }
                    mapView.onDestroy();
                }
            } finally {
                if (presentation != null) presentation.dismiss();
                if (display != null) display.release();
                if (reader != null) reader.close();
            }
        }

        private void fail(RuntimeException error) {
            Log.w("DuoWidget", "Google Maps widget snapshot failed: " + error.getClass().getSimpleName());
            result.complete(null);
        }
    }
}

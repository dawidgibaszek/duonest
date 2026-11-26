package com.belka.duonest;

import android.content.Context;
import android.graphics.RectF;
import android.os.Looper;
import android.util.AttributeSet;
import android.view.MotionEvent;
import com.getcapacitor.CapacitorWebView;
import java.util.ArrayList;
import java.util.List;

/**
 * Isolates WebView touch/scroll state from @capacitor/google-maps intercepting HTML overlay taps
 * and replaying cached MotionEvents off the Android UI thread.
 */
public final class DuoCapacitorWebView extends CapacitorWebView {
    private final List<RectF> overlayZones = new ArrayList<>();
    private boolean bypassingToWebView = false;

    public DuoCapacitorWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public void setOverlayZones(List<RectF> zones) {
        overlayZones.clear();
        if (zones != null) overlayZones.addAll(zones);
        if (overlayZones.isEmpty()) bypassingToWebView = false;
    }

    private boolean isInsideOverlayZone(float x, float y) {
        if (overlayZones.isEmpty()) return false;
        int width = getWidth();
        int height = getHeight();
        if (width <= 0 || height <= 0) return false;
        float normX = x / width;
        float normY = y / height;
        for (int i = 0; i < overlayZones.size(); i++) {
            if (overlayZones.get(i).contains(normX, normY)) return true;
        }
        return false;
    }

    @Override
    public void setOnTouchListener(OnTouchListener delegate) {
        if (delegate == null) {
            bypassingToWebView = false;
            super.setOnTouchListener(null);
            return;
        }
        super.setOnTouchListener((view, event) -> {
            int action = event.getActionMasked();
            if (action == MotionEvent.ACTION_DOWN) {
                bypassingToWebView = isInsideOverlayZone(event.getX(), event.getY());
            }
            if (bypassingToWebView) {
                if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
                    bypassingToWebView = false;
                }
                return false;
            }
            return delegate.onTouch(view, event);
        });
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            final MotionEvent copy = MotionEvent.obtain(event);
            post(() -> {
                try {
                    super.onTouchEvent(copy);
                } finally {
                    copy.recycle();
                }
            });
            return true;
        }
        return super.onTouchEvent(event);
    }
}

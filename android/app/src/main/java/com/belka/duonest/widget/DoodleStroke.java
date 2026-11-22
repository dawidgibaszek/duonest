package com.belka.duonest.widget;

import android.graphics.Color;
import androidx.annotation.Nullable;
import java.util.Arrays;
import java.util.Objects;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** One stroke of the shared doodle; points are normalized x,y pairs in 0..1 (same shape as DuoDoodleStroke). */
final class DoodleStroke {

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final int MAX_POINTS = 100_000;

    final float[] points;
    final String color;
    final float width;
    final boolean isEraser;

    private DoodleStroke(float[] points, String color, float width, boolean isEraser) {
        this.points = points;
        this.color = color;
        this.width = width;
        this.isEraser = isEraser;
    }

    /** Mirrors normalizeStroke() in useRealtimeSync.ts. */
    @Nullable
    static DoodleStroke fromJson(@Nullable JSONObject raw) {
        if (raw == null) return null;
        JSONArray rawPoints = raw.optJSONArray("points");
        String color = raw.optString("color", "");
        double width = raw.has("width") ? raw.optDouble("width", Double.NaN) : raw.optDouble("size", Double.NaN);
        if (rawPoints == null || rawPoints.length() < 2 || rawPoints.length() > MAX_POINTS || rawPoints.length() % 2 != 0) return null;
        if (!HEX_COLOR.matcher(color).matches() || Double.isNaN(width) || Double.isInfinite(width) || width <= 0 || width > 100) return null;

        float[] points = new float[rawPoints.length()];
        for (int i = 0; i < points.length; i++) {
            double value = rawPoints.optDouble(i, Double.NaN);
            if (Double.isNaN(value) || value < 0 || value > 1) return null;
            points[i] = (float) value;
        }
        return new DoodleStroke(points, color, (float) width, raw.optBoolean("isEraser", false));
    }

    JSONObject toJson() throws JSONException {
        JSONArray jsonPoints = new JSONArray();
        for (float point : points) jsonPoints.put((double) point);
        return new JSONObject()
            .put("points", jsonPoints)
            .put("color", color)
            .put("width", (double) width)
            .put("isEraser", isEraser);
    }

    int paintColor() {
        // White ink would vanish on the white board, so the app draws it in navy.
        return Color.parseColor("#ffffff".equalsIgnoreCase(color) ? "#0f172a" : color);
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof DoodleStroke)) return false;
        DoodleStroke stroke = (DoodleStroke) other;
        return width == stroke.width && isEraser == stroke.isEraser &&
            color.equals(stroke.color) && Arrays.equals(points, stroke.points);
    }

    @Override
    public int hashCode() {
        return Objects.hash(width, isEraser, color, Arrays.hashCode(points));
    }

    /** Partner broadcasts resend the same stroke while it grows; true when {@code next} continues this one. */
    boolean isContinuedBy(DoodleStroke next) {
        return next.isEraser == isEraser &&
            next.width == width &&
            next.color.equalsIgnoreCase(color) &&
            next.points.length >= points.length &&
            next.points[0] == points[0] &&
            next.points[1] == points[1];
    }
}

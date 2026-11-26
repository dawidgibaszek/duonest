package com.belka.duonest.widget;

import androidx.annotation.Nullable;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

final class PartnerLocation {
    private static final long MAX_AGE_MS = 24 * 60 * 60_000L;

    final double latitude;
    final double longitude;
    final long capturedAt;
    final long expiresAt;
    final String address;

    private PartnerLocation(double latitude, double longitude, long capturedAt, long expiresAt, String address) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.capturedAt = capturedAt;
        this.expiresAt = expiresAt;
        this.address = address;
    }

    boolean sameMapArea(@Nullable PartnerLocation other) {
        return other != null && Math.round(latitude * 10_000) == Math.round(other.latitude * 10_000)
            && Math.round(longitude * 10_000) == Math.round(other.longitude * 10_000);
    }

    @Nullable
    static PartnerLocation fromJson(@Nullable JSONObject json) {
        if (json == null) return null;
        double latitude = json.optDouble("latitude");
        double longitude = json.optDouble("longitude");
        long capturedAt = json.optLong("captured_at");
        long now = System.currentTimeMillis();
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude) || Math.abs(latitude) > 90 ||
            Math.abs(longitude) > 180 || capturedAt <= 0 || capturedAt > now + 60_000) return null;
        long expiresAt = Math.min(json.optLong("expires_at", capturedAt + MAX_AGE_MS), capturedAt + MAX_AGE_MS);
        if (expiresAt <= now) return null;
        JSONObject address = json.optJSONObject("address");
        List<String> parts = new ArrayList<>(3);
        if (address != null) {
            String street = (address.optString("street") + " " + address.optString("number")).trim();
            String city = address.optString("city").trim();
            String country = address.optString("country").trim();
            if (!street.isEmpty()) parts.add(street);
            if (!city.isEmpty()) parts.add(city);
            if (!country.isEmpty()) parts.add(country);
        }
        return new PartnerLocation(latitude, longitude, capturedAt, expiresAt, String.join(", ", parts));
    }
}

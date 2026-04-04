package com.fluxboard.common.util;

public final class TextUtils {

    private TextUtils() {
    }

    public static String trim(String value) {
        return value == null ? null : value.trim();
    }

    public static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

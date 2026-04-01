package com.fluxboard.common.dto;

import java.time.Instant;

public record ApiResponse<T>(
        boolean success,
        String code,
        String message,
        T data,
        Object meta,
        Instant timestamp
) {
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, "SUCCESS", message, data, null, Instant.now());
    }

    public static <T> ApiResponse<T> success(String message, T data, Object meta) {
        return new ApiResponse<>(true, "SUCCESS", message, data, meta, Instant.now());
    }

    public static ApiResponse<Void> success(String message) {
        return success(message, null);
    }
}

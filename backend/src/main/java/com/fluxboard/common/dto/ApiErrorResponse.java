package com.fluxboard.common.dto;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        boolean success,
        String code,
        String message,
        String path,
        List<FieldErrorDetail> errors,
        String traceId,
        Instant timestamp
) {
    public static ApiErrorResponse of(
            String code,
            String message,
            String path,
            List<FieldErrorDetail> errors,
            String traceId
    ) {
        return new ApiErrorResponse(false, code, message, path, errors, traceId, Instant.now());
    }

    public static ApiErrorResponse of(String code, String message, String path, String traceId) {
        return of(code, message, path, List.of(), traceId);
    }
}

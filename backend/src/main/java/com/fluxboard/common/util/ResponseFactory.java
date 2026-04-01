package com.fluxboard.common.util;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.dto.PageMeta;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;

public final class ResponseFactory {

    private ResponseFactory() {
    }

    public static <T> ResponseEntity<ApiResponse<T>> ok(String message, T data) {
        return ResponseEntity.ok(ApiResponse.success(message, data));
    }

    public static <T> ResponseEntity<ApiResponse<T>> ok(String message, T data, Object meta) {
        return ResponseEntity.ok(ApiResponse.success(message, data, meta));
    }

    public static ResponseEntity<ApiResponse<Void>> ok(String message) {
        return ResponseEntity.ok(ApiResponse.success(message));
    }

    public static <T> ResponseEntity<ApiResponse<T>> created(String message, T data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(message, data));
    }

    public static <T> ResponseEntity<ApiResponse<T>> created(String message, T data, Object meta) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(message, data, meta));
    }

    public static <T> ResponseEntity<ApiResponse<List<T>>> paged(String message, Page<T> page) {
        PageMeta meta = PageMeta.from(page);
        return ResponseEntity.ok(ApiResponse.success(message, page.getContent(), meta));
    }
}

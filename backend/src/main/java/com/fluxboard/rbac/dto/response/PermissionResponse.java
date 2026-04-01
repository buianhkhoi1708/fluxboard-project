package com.fluxboard.rbac.dto.response;

import java.time.Instant;

public record PermissionResponse(
        String id,
        String code,
        String module,
        String description,
        Instant createdAt,
        Instant updatedAt
) {
}

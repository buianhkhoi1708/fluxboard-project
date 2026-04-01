package com.fluxboard.rbac.dto.response;

import java.time.Instant;

public record RolePermissionResponse(
        String id,
        String roleId,
        String permissionId,
        Instant createdAt
) {
}

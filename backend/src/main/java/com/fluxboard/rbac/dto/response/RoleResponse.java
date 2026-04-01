package com.fluxboard.rbac.dto.response;

import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.enums.Scope;
import java.time.Instant;

public record RoleResponse(
        String id,
        Role name,
        Scope scope,
        String description,
        Instant createdAt,
        Instant updatedAt
) {
}

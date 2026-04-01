package com.fluxboard.rbac.dto.request;

import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.enums.Scope;
import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(
        @NotNull(message = "Role is required.")
        Role name,

        @NotNull(message = "Role scope is required.")
        Scope scope,
        String description
) {
}

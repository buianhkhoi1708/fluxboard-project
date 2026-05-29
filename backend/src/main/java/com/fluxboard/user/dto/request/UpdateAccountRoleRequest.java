package com.fluxboard.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAccountRoleRequest(
        @NotBlank(message = "Role ID is required.")
        @Size(max = 50, message = "Role ID must be at most 50 characters.")
        String roleId
) {}
package com.fluxboard.rbac.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePermissionRequest(
        @NotBlank(message = "Permission code must not be blank.")
        @Size(max = 100, message = "Permission code must be at most 100 characters.")
        String code,

        @NotBlank(message = "Permission module must not be blank.")
        @Size(max = 100, message = "Permission module must be at most 100 characters.")
        String module,

        @Size(max = 255, message = "Description must be at most 255 characters.")
        String description
) {
}

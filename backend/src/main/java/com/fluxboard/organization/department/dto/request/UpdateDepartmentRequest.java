package com.fluxboard.organization.department.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDepartmentRequest(
        // @NotBlank(message = "Department name must not be blank.")
        @Size(max = 150, message = "Department name must be at most 150 characters.")
        String name,

        // @NotBlank(message = "Department code must not be blank.")
        @Size(max = 50, message = "Department code must be at most 50 characters.")
        String code,

        @Size(max = 500, message = "Department description must be at most 500 characters.")
        String description,

        @Size(max = 50, message = "Manager ID must be at most 50 characters.")
        String managerId,

        @Size(max = 50, message = "Status must be at most 50 characters.")
        String status
) {
}

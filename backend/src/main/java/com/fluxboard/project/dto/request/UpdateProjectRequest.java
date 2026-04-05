package com.fluxboard.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProjectRequest(
        @NotBlank(message = "Project name must not be blank.")
        @Size(max = 150, message = "Project name must be at most 150 characters.")
        String name,

        @NotBlank(message = "Owner ID must not be blank.")
        String ownerId,

        @NotBlank(message = "Department ID must not be blank.")
        String departmentId,

        @NotBlank(message = "Project status must not be blank.")
        @Size(max = 50, message = "Project status must be at most 50 characters.")
        String status
) {
}

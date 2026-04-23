package com.fluxboard.organization.team.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTeamRequest(
        @NotBlank(message = "Team name must not be blank.")
        @Size(max = 150, message = "Team name must be at most 150 characters.")
        String name,

        @NotBlank(message = "Team code must not be blank.")
        @Size(max = 50, message = "Team code must be at most 50 characters.")
        String code,

        @NotBlank(message = "Department ID must not be blank.")
        String departmentId,

        @Size(max = 500, message = "Team description must be at most 500 characters.")
        String description
) {
}

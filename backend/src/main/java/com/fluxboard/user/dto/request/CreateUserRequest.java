package com.fluxboard.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank(message = "Email must not be blank.")
        @Email(message = "Email is invalid.")
        @Size(max = 150, message = "Email must be at most 150 characters.")
        String email,

        @NotBlank(message = "Password must not be blank.")
        @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters.")
        String password,

        @NotBlank(message = "Full name must not be blank.")
        @Size(max = 150, message = "Full name must be at most 150 characters.")
        String fullName,

        @Size(max = 500, message = "Avatar URL must be at most 500 characters.")
        String avatarUrl,

        @Size(max = 50, message = "Role ID must be at most 50 characters.")
        String roleId,

        @Size(max = 50, message = "Team ID must be at most 50 characters.")
        String teamId
) {
}

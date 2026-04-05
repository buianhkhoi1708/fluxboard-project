package com.fluxboard.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Email must not be blank.")
        @Email(message = "Email is invalid.")
        @Size(max = 150, message = "Email must be at most 150 characters.")
        String email,

        @NotBlank(message = "Password must not be blank.")
        @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters.")
        String password
) {
}

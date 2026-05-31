package com.fluxboard.user.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAccountRoleRequest(
        @JsonProperty("role_id")
        @JsonAlias({"roleId"})
        @NotBlank(message = "Role ID is required.")
        @Size(max = 50, message = "Role ID must be at most 50 characters.")
        String roleId
) {
}
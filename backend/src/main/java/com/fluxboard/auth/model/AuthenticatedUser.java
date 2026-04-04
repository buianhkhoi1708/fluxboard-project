package com.fluxboard.auth.model;

public record AuthenticatedUser(
        String userId,
        String roleId
) {
}

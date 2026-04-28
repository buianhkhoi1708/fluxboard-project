package com.fluxboard.user.dto.response;

public record UnassignedUserResponse(
        String id,
        String fullName,
        String email,
        String roleId
) {
}

package com.fluxboard.user.dto.response;

public record UnassignedUserResponse(
        String id,
        String fullName,
        String email,
        String roleId,
        String roleName,
        boolean online,
        String status
) {
    public UnassignedUserResponse(String id, String fullName, String email, String roleId) {
        this(id, fullName, email, roleId, null, false, null);
    }
}
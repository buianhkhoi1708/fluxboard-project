package com.fluxboard.organization.department.dto.response;

public record UserHierarchyResponse(
        String id,
        String fullName,
        String email,
        String status
) {
}

package com.fluxboard.organization.dto.response;

public record OrganizationSearchResponse(
        String userId,
        String fullName,
        String email,
        TeamDto team,
        DepartmentDto department
) {
    public record TeamDto(String id, String name) {}
    public record DepartmentDto(String id, String name) {}
}

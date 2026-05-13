package com.fluxboard.organization.department.dto.response;

import java.util.List;

public record DepartmentHierarchyResponse(
        String id,
        String name,
        String managerId,
        List<TeamHierarchyResponse> teams
) {
}

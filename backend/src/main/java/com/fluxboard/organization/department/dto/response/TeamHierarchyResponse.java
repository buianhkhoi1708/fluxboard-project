package com.fluxboard.organization.department.dto.response;

import java.util.List;

public record TeamHierarchyResponse(
        String id,
        String name,
        String leadId,
        List<UserHierarchyResponse> members
) {
}

package com.fluxboard.organization.department.dto.response;

import java.util.List;

public record DepartmentHierarchyResponse(
        String id,
        String name,
        String code,         // 🚀 THÊM: Mã Code phòng ban
        String managerId,
        String managerName,
        List<TeamHierarchyResponse> teams
) {
}
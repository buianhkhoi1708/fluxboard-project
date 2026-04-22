package com.fluxboard.organization.service;

import com.fluxboard.organization.department.service.DepartmentService;
import com.fluxboard.organization.department.dto.response.OrganizationMetricsResponse;
import com.fluxboard.organization.team.service.TeamService;
import org.springframework.stereotype.Service;

@Service
public class OrganizationService {

    private static final long DEFAULT_DEPARTMENT_COUNT = 12L;

    private final DepartmentService departmentService;
    private final TeamService teamService;

    public OrganizationService(DepartmentService departmentService, TeamService teamService) {
        this.departmentService = departmentService;
        this.teamService = teamService;
    }

    public OrganizationMetricsResponse getMetrics() {
        long totalDepartments = departmentService.countActive();
        if (totalDepartments == 0) {
            totalDepartments = DEFAULT_DEPARTMENT_COUNT;
        }
        return new OrganizationMetricsResponse(totalDepartments, teamService.countActive());
    }
}

package com.fluxboard.dashboard.dto.response;

import java.util.List;

public record AdminMetricsResponse(
    OrganizationKpi organizationKpi,
    CompanyDeadlineHealth companyDeadlineHealth,
    List<DepartmentPoint> departmentPointsDistribution
) {
    public record OrganizationKpi(long totalUsers, long totalDepartments, long totalTeams) {}
    
    public record CompanyDeadlineHealth(long onTrack, long atRisk, long overdue, long totalExtensions) {}
    
    public record DepartmentPoint(String departmentId, long totalPoints, long completedPoints, long overdueTasks) {}
}
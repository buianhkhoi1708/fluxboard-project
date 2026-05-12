package com.fluxboard.dashboard.repository;

import com.fluxboard.dashboard.dto.response.AdminMetricsResponse;
import com.fluxboard.dashboard.dto.response.ManagerMetricsResponse;
import com.fluxboard.dashboard.dto.response.MemberMetricsResponse;

public interface DashboardRepositoryCustom {
    AdminMetricsResponse getAdminMetrics(String timeRange, String departmentId);
    ManagerMetricsResponse getManagerMetrics(String timeRange, String teamId);
    MemberMetricsResponse getMemberMetrics(String userId);
}
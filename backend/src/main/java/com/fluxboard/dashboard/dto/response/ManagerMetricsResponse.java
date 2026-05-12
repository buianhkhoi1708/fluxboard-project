package com.fluxboard.dashboard.dto.response;

import java.time.Instant;
import java.util.List;

public record ManagerMetricsResponse(
    List<TeamWorkload> teamWorkloadCapacity,
    List<AtRiskTask> atRiskTasks,
    List<AiEfficiency> aiEfficiency
) {
    public record TeamWorkload(String userId, String fullName, long currentPoints, String status) {}
    
    public record AtRiskTask(String taskId, String title, int storyPoint, String priority, Instant dueDate, String deadlineStatus, int extensionCount) {}
    
    public record AiEfficiency(String taskTitle, int aiSuggestedPoint, int actualPoint) {}
}
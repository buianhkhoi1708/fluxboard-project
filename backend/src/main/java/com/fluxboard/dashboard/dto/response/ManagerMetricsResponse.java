package com.fluxboard.dashboard.dto.response;

import java.time.Instant;
import java.util.List;

public record ManagerMetricsResponse(
        List<TeamWorkload> teamWorkloadCapacity,
        TeamDeadlineStatus teamDeadlineStatus,
        List<AtRiskTask> atRiskTasks,
        List<AiEfficiency> aiEfficiency
) {
    public record TeamWorkload(
            String userId,
            String fullName,
            long currentPoints,
            long capacityPoints,
            double loadPercentage,
            String status
    ) {}

    public record TeamDeadlineStatus(
            long onTrack,
            long atRisk,
            long overdue,
            long late
    ) {}

    public record AtRiskTask(
            String taskId,
            String title,
            int storyPoint,
            String priority,
            Instant dueDate,
            String deadlineStatus,
            int extensionCount,
            String actionUrl
    ) {}

    public record AiEfficiency(
            String taskId,
            String taskTitle,
            double aiSuggestedPoint,
            double actualPoint,
            double manualPoint,
            double deviationPoint,
            double deviationPercentage,
            double accuracyScore,
            String deviationStatus,
            String evaluationComment
    ) {}
}
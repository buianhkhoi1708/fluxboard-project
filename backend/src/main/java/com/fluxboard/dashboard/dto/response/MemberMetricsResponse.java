package com.fluxboard.dashboard.dto.response;

import java.time.Instant;
import java.util.List;

public record MemberMetricsResponse(
    MyContribution myContribution,
    List<FocusTask> myFocusBoard
) {
    public record MyContribution(long completedTasks, long totalAssigned) {}
    
    public record FocusTask(String taskId, String title, String priority, int storyPoint, Instant dueDate, String deadlineStatus, int extensionsUsed) {}
}
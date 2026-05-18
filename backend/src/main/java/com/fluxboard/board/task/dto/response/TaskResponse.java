package com.fluxboard.board.task.dto.response;

import com.fluxboard.board.task.enums.TaskPriority;
import java.time.Instant;
import java.util.List;

public record TaskResponse(
        String id,
        String title,
        String description,
        String parentTaskId,
        List<TaskUserSummaryResponse> assignees,
        TaskPriority priority,
        Instant startDate,
        Instant dueDate,
        String status,
        Integer storyPoint,
        Instant estimatedDate,
        int order,
        Integer aiSuggestedPoint,
        String aiEstimatedReason,
        TaskUserSummaryResponse author,
        Instant createdAt,
        Instant updatedAt,
        String boardId
) {
}

package com.fluxboard.board.task.dto.response;

import java.time.Instant;
import java.util.List;

public record TaskResponse(
        String id,
        String taskCode,
        String projectId,
        String boardId,
        String listId,
        String sprintId,
        String parentTaskId,
        String reporterUserId,
        List<String> assigneeIds,
        List<String> labelIds,
        String status,
        String priority,
        int position,
        Instant createdAt,
        Instant updatedAt
) {
}

package com.fluxboard.board.task.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fluxboard.board.task.enums.TaskPriority;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record TaskResponse(
        String id,
        String title,
        String description,

        @JsonProperty("parent_task_id")
        String parentTaskId,

        List<TaskUserSummaryResponse> assignees,
        TaskPriority priority,

        @JsonProperty("start_date")
        Instant startDate,

        @JsonProperty("due_date")
        Instant dueDate,

        String status,

        @JsonProperty("story_point")
        Integer storyPoint,

        @JsonProperty("estimated_date")
        Instant estimatedDate,

        int order,

        @JsonProperty("ai_suggested_point")
        Integer aiSuggestedPoint,

        @JsonProperty("ai_estimated_reason")
        String aiEstimatedReason,

        TaskUserSummaryResponse author,

        @JsonProperty("created_at")
        Instant createdAt,

        @JsonProperty("updated_at")
        Instant updatedAt,

        @JsonProperty("board_id")
        String boardId,

        List<Map<String, Object>> attachments,
        List<Map<String, Object>> comments
) {
}
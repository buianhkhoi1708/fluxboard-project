package com.fluxboard.board.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record BoardTaskDetailResponse(
        @JsonProperty("id")
        String id,

        @JsonProperty("order")
        int order,

        @JsonProperty("title")
        String title,

        @JsonProperty("description")
        String description,

        @JsonProperty("assignees")
        List<String> assignees,

        @JsonProperty("priority")
        String priority,

        @JsonProperty("start_date")
        String startDate,

        @JsonProperty("due_date")
        String dueDate,

        @JsonProperty("estimated_days")
        Integer estimatedDays,

        @JsonProperty("story_points")
        Integer storyPoints,

        @JsonProperty("ai_suggested_points")
        Integer aiSuggestedPoints,

        @JsonProperty("ai_estimation_reason")
        String aiEstimationReason,

        @JsonProperty("status")
        String status,

        @JsonProperty("subtasks")
        List<BoardTaskDetailResponse> subtasks
) {
}

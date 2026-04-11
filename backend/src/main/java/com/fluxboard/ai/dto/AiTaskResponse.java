package com.fluxboard.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AiTaskResponse(
    @JsonProperty("tasks")
    List<AiTaskItem> tasks
) {
    public record AiTaskItem(
        @JsonProperty("title")
        String title,

        @JsonProperty("description")
        String description,

        @JsonProperty("assignee_user_id")
        String assigneeUserId, // Dùng camelCase chuẩn Java, map sang snake_case của JSON

        @JsonProperty("story_point")
        Integer storyPoint,

        @JsonProperty("ai_estimation_reason")
        String aiEstimationReason,

        @JsonProperty("priority")
        String priority
    ) {}
}
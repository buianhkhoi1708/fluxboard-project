package com.fluxboard.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

// 🚀 BÙA CHÚ ĐÂY SẾP: Bỏ qua tất cả các field lạ AI tự bịa ra
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiTaskResponse(
    List<AiTaskItem> tasks
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AiTaskItem(
        String title,
        @JsonProperty("name") String name, 
        String description,
        
        List<AiSubTaskItem> subtasks, 
        
        @JsonProperty("assignee_user_id")
        String assigneeUserId,
        
        @JsonProperty("story_point")
        Integer storyPoint,
        
        @JsonProperty("ai_estimation_reason")
        String aiEstimatedReason, 
        
        String priority
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AiSubTaskItem(
        @JsonProperty("subtask_id") String subtaskId, // 🚀 Hứng luôn cái AI vừa bịa ra
        @JsonProperty("name") String name,
        String title,
        String description,
        String priority,
        @JsonProperty("assignee_user_id") String assigneeUserId
    ) {}
}
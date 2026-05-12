package com.fluxboard.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

// 🚀 BÙA CHÚ V6: Khóa chặt định dạng, bắt trọn tinh hoa AI
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiTaskResponse(
    @JsonProperty("suggested_columns")
    List<String> suggestedColumns, // 🚀 Cần cái này để tạo Phase (ADVANCED mode)
    
    List<AiTaskItem> tasks
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AiTaskItem(
        String title,
        @JsonProperty("name") String name, 
        String description,
        
        @JsonProperty("column_name")
        String columnName, // 🚀 Bắt AI gán task vào đúng Phase (Cột)
        
        @JsonProperty("assignee_user_id")
        String assigneeUserId,
        
        @JsonProperty("story_point")
        Integer storyPoint,
        
        @JsonProperty("ai_estimation_reason")
        String aiEstimatedReason, 
        
        String priority,
        
        @JsonProperty("start_date")
        String startDate, // 🚀 Deadline bắt đầu
        
        @JsonProperty("due_date")
        String dueDate,   // 🚀 Deadline kết thúc
        
        List<AiSubTaskItem> subtasks
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AiSubTaskItem(
        @JsonProperty("subtask_id") String subtaskId,
        @JsonProperty("name") String name,
        String title,
        String description,
        String priority,
        @JsonProperty("assignee_user_id") String assigneeUserId
    ) {}
}
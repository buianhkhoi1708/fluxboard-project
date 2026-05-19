package com.fluxboard.board.dto.response;

import java.util.*;

public record BoardTaskDetailResponse(
        String id,
    int order,
    String title,
    String description,
    List<String> assignees,
    String priority,
    String startDate,
    String dueDate,
    Integer estimatedDays,
    Integer storyPoints,
    Integer aiSuggestedPoints,
    String aiEstimationReason,
    String status,
    List<BoardTaskDetailResponse> subtasks, // 🚀 subtasks nằm kế cuối
    List<Map<String, Object>> attachments

) {
}

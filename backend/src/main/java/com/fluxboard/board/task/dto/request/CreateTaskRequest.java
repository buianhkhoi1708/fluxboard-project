package com.fluxboard.board.task.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateTaskRequest(
        @NotBlank(message = "Task code must not be blank.")
        @Size(max = 80, message = "Task code must be at most 80 characters.")
        String taskCode,

        @NotBlank(message = "Project ID must not be blank.")
        String projectId,

        @NotBlank(message = "Board ID must not be blank.")
        String boardId,

        @NotBlank(message = "List ID must not be blank.")
        String listId,

        String sprintId,

        String parentTaskId,

        @NotBlank(message = "Reporter user ID must not be blank.")
        String reporterUserId,

        List<String> assigneeIds,

        List<String> labelIds,

        @NotBlank(message = "Status must not be blank.")
        @Size(max = 50, message = "Status must be at most 50 characters.")
        String status,

        @NotBlank(message = "Priority must not be blank.")
        @Size(max = 50, message = "Priority must be at most 50 characters.")
        String priority,

        @Min(value = 1, message = "Position must be at least 1.")
        Integer position
) {
}

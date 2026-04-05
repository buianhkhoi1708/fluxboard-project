package com.fluxboard.board.task.dto.request;

import com.fluxboard.board.task.enums.TaskPriority;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public record CreateTaskRequest(
        @NotBlank(message = "Title must not be blank.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @Size(max = 5000, message = "Description must be at most 5000 characters.")
        String description,

        @NotBlank(message = "Column ID must not be blank.")
        String columnId,

        String parentTaskId,

        List<String> assigneesUserId,

        @NotNull(message = "Priority is required.")
        TaskPriority priority,

        Instant startDate,

        Instant dueDate,

        @NotBlank(message = "Status must not be blank.")
        @Size(max = 50, message = "Status must be at most 50 characters.")
        String status,

        @Min(value = 0, message = "Story point must be at least 0.")
        Integer storyPoint,

        Instant estimatedDate,

        @Min(value = 0, message = "AI suggested point must be at least 0.")
        Integer aiSuggestedPoint,

        @Size(max = 2000, message = "AI estimated reason must be at most 2000 characters.")
        String aiEstimatedReason
) {
}

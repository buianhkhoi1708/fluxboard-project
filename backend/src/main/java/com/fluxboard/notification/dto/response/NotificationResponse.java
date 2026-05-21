package com.fluxboard.notification.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private String id;
    private String recipientId;
    private String type; // TASK_CREATED, TASK_MOVED, TASK_UPDATED, TASK_ASSIGNED, etc.
    private String title;
    private String message;
    private boolean isRead;
    private Map<String, Object> metadata;
    private Instant createdAt;
    private Instant updatedAt;
}
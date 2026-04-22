package com.fluxboard.activity.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ActivityResponse {
    private String id;
    private String projectId;
    private String userId;
    private String userName;   
    private String userAvatar; 
    private String action;     
    private LocalDateTime createdAt;
}
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import java.time.Instant;

public record ActivityResponse(
        String id,
        ActivitySource sourceType,
        String sourceId,
        String projectId,
        String boardId,
        String taskId,
        String actorUserId,
        ActivityActorResponse actor,
        ActivityAction action,
        String field,
        String oldValue,
        String newValue,
        String message,
        Instant createdAt,
        Instant updatedAt
) {
}

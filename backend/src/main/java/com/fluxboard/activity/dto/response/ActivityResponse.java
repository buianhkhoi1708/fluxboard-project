package com.fluxboard.activity.dto.response;

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
) {}
package com.fluxboard.activity.dto.response;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;

import java.time.Instant;
import java.util.Map;

public record ActivityResponse(
        String id,
        ActivityEntity.ActivityType activityType,
        ActivitySource sourceType,
        String sourceId,
        String projectId,
        String boardId,
        String taskId,
        String actorUserId,
        ActivityActorResponse actor,
        String actorRoleId,
        String actorRoleName,
        String targetUserId,
        ActivityActorResponse targetUser,
        String targetRoleId,
        String targetRoleName,
        ActivityAction action,
        String field,
        String oldValue,
        String newValue,
        String message,
        String ipAddress,
        String deviceInfo,
        Map<String, Object> metadata,
        Instant createdAt,
        Instant updatedAt
) {}
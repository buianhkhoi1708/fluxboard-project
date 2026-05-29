package com.fluxboard.activity.dto.request;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;

import java.time.Instant;
import java.util.List;

public record ActivityFilterRequest(
        ActivityEntity.ActivityType activityType,
        List<ActivitySource> sourceTypes,
        List<ActivityAction> actions,
        List<String> actorUserIds,
        List<String> targetUserIds,
        String sourceId,
        String projectId,
        String boardId,
        String taskId,
        Instant from,
        Instant to
) {}
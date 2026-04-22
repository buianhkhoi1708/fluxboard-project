package com.fluxboard.activity.dto.request;

import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import java.time.Instant;
import java.util.List;

public record ActivityFilterRequest(
        List<ActivitySource> sourceTypes,
        List<ActivityAction> actions,
        List<String> actorUserIds,
        String sourceId,
        String projectId,
        String boardId,
        String taskId,
        Instant from,
        Instant to
) {
}

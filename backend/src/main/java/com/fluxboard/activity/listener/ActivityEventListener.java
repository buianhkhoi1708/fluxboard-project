package com.fluxboard.activity.listener;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.event.ActivityCreatedEvent;
import com.fluxboard.activity.repository.ActivityRepository;
import com.fluxboard.common.util.TextUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ActivityEventListener {
    private final ActivityRepository activityRepository;

    @Async
    @EventListener
    public void handleActivityEvent(ActivityCreatedEvent event) {
        if (event.getSourceType() == null || event.getAction() == null) return;

        ActivityEntity entity = new ActivityEntity();
        entity.setActivityType(ActivityEntity.ActivityType.ACTIVITY_LOG);
        entity.setSourceType(event.getSourceType());
        entity.setSourceId(TextUtils.trimToNull(event.getSourceId()));
        entity.setProjectId(TextUtils.trimToNull(event.getProjectId()));
        entity.setBoardId(TextUtils.trimToNull(event.getBoardId()));
        entity.setTaskId(TextUtils.trimToNull(event.getTaskId()));
        entity.setActorUserId(TextUtils.trimToNull(event.getActorUserId()));
        entity.setAction(event.getAction());
        entity.setField(TextUtils.trimToNull(event.getField()));
        entity.setOldValue(TextUtils.trimToNull(event.getOldValue()));
        entity.setNewValue(TextUtils.trimToNull(event.getNewValue()));
        entity.setMessage(TextUtils.trimToNull(event.getMessage()));
        activityRepository.save(entity);
    }
}
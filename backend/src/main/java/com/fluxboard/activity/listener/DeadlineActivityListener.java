package com.fluxboard.activity.listener;

import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.deadline.event.DeadlineExtendedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DeadlineActivityListener {
    private final ActivityService activityService;

    @Async
    @EventListener
    public void handleDeadlineExtension(DeadlineExtendedEvent event) {
        activityService.logTaskDeadlineExtended(
            event.getTaskId(),
            event.getBoardId(),
            event.getProjectId(),
            event.getUserId(),
            event.getOldDueDate() != null ? event.getOldDueDate().toString() : null,
            event.getNewDueDate() != null ? event.getNewDueDate().toString() : null,
            event.getReason()
        );
    }
}
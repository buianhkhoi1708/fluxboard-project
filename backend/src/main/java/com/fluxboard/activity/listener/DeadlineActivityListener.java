package com.fluxboard.activity.listener;

import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.deadline.event.ExtensionApprovedEvent;
import com.fluxboard.deadline.event.ExtensionRejectedEvent;
import com.fluxboard.deadline.event.ExtensionRequestedEvent;
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
    public void handleExtensionRequested(ExtensionRequestedEvent event) {
        activityService.logExtensionRequested(
            event.getTaskId(),
            event.getProjectId(),
            event.getRequesterId(),
            event.getCurrentDueDate() != null ? event.getCurrentDueDate().toString() : null,
            event.getRequestedDueDate() != null ? event.getRequestedDueDate().toString() : null,
            event.getReason()
        );
    }

    @Async
    @EventListener
    public void handleExtensionApproved(ExtensionApprovedEvent event) {
        activityService.logExtensionApproved(
            event.getTaskId(),
            event.getProjectId(),
            event.getManagerId(),
            event.getOldDueDate() != null ? event.getOldDueDate().toString() : null,
            event.getNewDueDate() != null ? event.getNewDueDate().toString() : null
        );
    }

    @Async
    @EventListener
    public void handleExtensionRejected(ExtensionRejectedEvent event) {
        activityService.logExtensionRejected(
            event.getTaskId(),
            event.getCurrentDueDate() != null ? event.getCurrentDueDate().toString() : null,
            event.getManagerReason()
        );
    }
}
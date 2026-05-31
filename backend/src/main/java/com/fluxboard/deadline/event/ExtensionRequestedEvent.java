package com.fluxboard.deadline.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;

@Getter
public class ExtensionRequestedEvent extends ApplicationEvent {
    private final String taskId;
    private final String projectId;
    private final String requesterId;
    private final String targetManagerId;
    private final Instant currentDueDate;
    private final Instant requestedDueDate;
    private final String reason;

    public ExtensionRequestedEvent(Object source, String taskId, String projectId, String requesterId, String targetManagerId, Instant currentDueDate, Instant requestedDueDate, String reason) {
        super(source);
        this.taskId = taskId;
        this.projectId = projectId;
        this.requesterId = requesterId;
        this.targetManagerId = targetManagerId;
        this.currentDueDate = currentDueDate;
        this.requestedDueDate = requestedDueDate;
        this.reason = reason;
    }

    public Instant getOriginalDueDate() {
        return currentDueDate;
    }
}
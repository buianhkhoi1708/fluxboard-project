package com.fluxboard.deadline.event;

import org.springframework.context.ApplicationEvent;
import lombok.Getter;

import java.time.Instant;

@Getter
public class DeadlineConfigChangedEvent extends ApplicationEvent {
    private final String taskId;
    private final String userId;
    private final Instant oldDueDate;
    private final Instant newDueDate;
    private final Instant changedAt;

    public DeadlineConfigChangedEvent(Object source, String taskId, String userId, Instant oldDueDate, Instant newDueDate) {
        super(source);
        this.taskId = taskId;
        this.userId = userId;
        this.oldDueDate = oldDueDate;
        this.newDueDate = newDueDate;
        this.changedAt = Instant.now();
    }
}
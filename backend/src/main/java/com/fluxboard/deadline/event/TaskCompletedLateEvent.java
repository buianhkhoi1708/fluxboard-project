package com.fluxboard.deadline.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class TaskCompletedLateEvent extends ApplicationEvent {
    private final String taskId;
    private final String userId;
    private final String projectId;
    private final long lateDurationMinutes; 

    public TaskCompletedLateEvent(Object source, String taskId, String userId, String projectId, long lateDurationMinutes) {
        super(source);
        this.taskId = taskId;
        this.userId = userId;
        this.projectId = projectId;
        this.lateDurationMinutes = lateDurationMinutes;
    }
}
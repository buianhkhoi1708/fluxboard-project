package com.fluxboard.deadline.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;
import java.util.List;

@Getter
public class ExtensionApprovedEvent extends ApplicationEvent {
    private final String taskId;
    private final String projectId;
    private final String managerId;
    private final List<String> targetUserIds;
    private final Instant originalDueDate;
    private final Instant newDueDate;
    private final String reason;
    private final String requesterId;

    public ExtensionApprovedEvent(Object source, String taskId, String projectId, String managerId, List<String> targetUserIds, Instant originalDueDate, Instant newDueDate) {
        this(source, taskId, projectId, managerId, targetUserIds, originalDueDate, newDueDate, null, null);
    }

    public ExtensionApprovedEvent(Object source, String taskId, String projectId, String managerId, List<String> targetUserIds, Instant originalDueDate, Instant newDueDate, String reason, String requesterId) {
        super(source);
        this.taskId = taskId;
        this.projectId = projectId;
        this.managerId = managerId;
        this.targetUserIds = targetUserIds;
        this.originalDueDate = originalDueDate;
        this.newDueDate = newDueDate;
        this.reason = reason;
        this.requesterId = requesterId;
    }

    public Instant getOldDueDate() {
        return originalDueDate;
    }

    public Instant getCurrentDueDate() {
        return originalDueDate;
    }
}
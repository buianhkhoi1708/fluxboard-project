package com.fluxboard.deadline.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;
import java.util.List;

@Getter
public class ExtensionRejectedEvent extends ApplicationEvent {
    private final String taskId;
    private final String projectId;
    private final String managerId;
    private final List<String> targetUserIds;
    private final Instant currentDueDate;
    private final Instant requestedDueDate;
    private final String reason;
    private final String managerReason;
    private final String requesterId;

    public ExtensionRejectedEvent(Object source, String taskId, List<String> targetUserIds, Instant currentDueDate, String managerReason) {
        this(source, taskId, null, null, targetUserIds, currentDueDate, null, null, managerReason, null);
    }

    public ExtensionRejectedEvent(Object source, String taskId, String projectId, String managerId, List<String> targetUserIds, Instant currentDueDate, Instant requestedDueDate, String reason, String managerReason, String requesterId) {
        super(source);
        this.taskId = taskId;
        this.projectId = projectId;
        this.managerId = managerId;
        this.targetUserIds = targetUserIds;
        this.currentDueDate = currentDueDate;
        this.requestedDueDate = requestedDueDate;
        this.reason = reason;
        this.managerReason = managerReason;
        this.requesterId = requesterId;
    }
}
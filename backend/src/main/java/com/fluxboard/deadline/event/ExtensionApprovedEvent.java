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
    private final Instant oldDueDate;
    private final Instant newDueDate;

    public ExtensionApprovedEvent(Object source, String taskId, String projectId, String managerId, List<String> targetUserIds, Instant oldDueDate, Instant newDueDate) {
        super(source);
        this.taskId = taskId;
        this.projectId = projectId;
        this.managerId = managerId;
        this.targetUserIds = targetUserIds;
        this.oldDueDate = oldDueDate;
        this.newDueDate = newDueDate;
    }
}
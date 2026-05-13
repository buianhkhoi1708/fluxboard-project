package com.fluxboard.deadline.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import java.time.Instant;
import java.util.List;

@Getter
public class ExtensionRejectedEvent extends ApplicationEvent {
    private final String taskId;
    private final List<String> targetUserIds; 
    private final Instant currentDueDate;
    private final String managerReason;

    public ExtensionRejectedEvent(Object source, String taskId, List<String> targetUserIds, Instant currentDueDate, String managerReason) {
        super(source);
        this.taskId = taskId;
        this.targetUserIds = targetUserIds;
        this.currentDueDate = currentDueDate;
        this.managerReason = managerReason;
    }
}
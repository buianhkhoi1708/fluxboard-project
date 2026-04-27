package com.fluxboard.deadline.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import java.time.Instant;

@Getter
public class DeadlineExtendedEvent extends ApplicationEvent {
    private final String taskId;
    private final String projectId;
    private final String boardId;
    private final String userId;
    private final Instant oldDueDate;
    private final Instant newDueDate;
    private final String reason;

    public DeadlineExtendedEvent(Object source, String taskId, String projectId, String boardId, String userId, Instant oldDueDate, Instant newDueDate, String reason) {
        super(source);
        this.taskId = taskId;
        this.projectId = projectId;
        this.boardId = boardId;
        this.userId = userId;
        this.oldDueDate = oldDueDate;
        this.newDueDate = newDueDate;
        this.reason = reason;
    }
}
package com.fluxboard.board.task.event;

import org.springframework.context.ApplicationEvent;

import java.time.Instant;

public class TaskCreatedEvent extends ApplicationEvent {
    private final String taskId;
    private final Instant startDate;
    private final Instant dueDate;
    private final String actorUserId;
    private final String boardId;
    private final String projectId;

    public TaskCreatedEvent(Object source, String taskId, Instant startDate, Instant dueDate) {
        this(source, taskId, startDate, dueDate, null, null, null);
    }

    public TaskCreatedEvent(Object source, String taskId, Instant startDate, Instant dueDate, String actorUserId, String boardId, String projectId) {
        super(source);
        this.taskId = taskId;
        this.startDate = startDate;
        this.dueDate = dueDate;
        this.actorUserId = actorUserId;
        this.boardId = boardId;
        this.projectId = projectId;
    }

    public String getTaskId() {
        return taskId;
    }

    public Instant getStartDate() {
        return startDate;
    }

    public Instant getDueDate() {
        return dueDate;
    }

    public String getActorUserId() {
        return actorUserId;
    }

    public String getUserId() {
        return actorUserId;
    }

    public String getSenderId() {
        return actorUserId;
    }

    public String getBoardId() {
        return boardId;
    }

    public String getProjectId() {
        return projectId;
    }
}
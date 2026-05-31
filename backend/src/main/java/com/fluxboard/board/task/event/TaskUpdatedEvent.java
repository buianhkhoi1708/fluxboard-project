package com.fluxboard.board.task.event;

import org.springframework.context.ApplicationEvent;

import java.time.Instant;

public class TaskUpdatedEvent extends ApplicationEvent {
    private final String taskId;
    private final Instant startDate;
    private final Instant dueDate;
    private final String actorUserId;
    private final String boardId;
    private final String projectId;
    private final String type;
    private final String sourceColumnId;
    private final String destinationColumnId;
    private final String destinationColumnName;
    private final boolean done;

    public TaskUpdatedEvent(Object source, String taskId, Instant startDate, Instant dueDate) {
        this(source, taskId, startDate, dueDate, null, null, null, "TASK_UPDATE", null, null, null, false);
    }

    public TaskUpdatedEvent(Object source, String taskId, Instant startDate, Instant dueDate, String actorUserId, String boardId, String projectId, String type, String sourceColumnId, String destinationColumnId, String destinationColumnName, boolean done) {
        super(source);
        this.taskId = taskId;
        this.startDate = startDate;
        this.dueDate = dueDate;
        this.actorUserId = actorUserId;
        this.boardId = boardId;
        this.projectId = projectId;
        this.type = type == null ? "TASK_UPDATE" : type;
        this.sourceColumnId = sourceColumnId;
        this.destinationColumnId = destinationColumnId;
        this.destinationColumnName = destinationColumnName;
        this.done = done;
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

    public String getUpdatedBy() {
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

    public String getType() {
        return type;
    }

    public String getEventType() {
        return type;
    }

    public String getSourceColumnId() {
        return sourceColumnId;
    }

    public String getFromColumnId() {
        return sourceColumnId;
    }

    public String getDestinationColumnId() {
        return destinationColumnId;
    }

    public String getDestColumnId() {
        return destinationColumnId;
    }

    public String getToColumnId() {
        return destinationColumnId;
    }

    public String getDestinationColumnName() {
        return destinationColumnName;
    }

    public String getDestColumnName() {
        return destinationColumnName;
    }

    public String getColumnName() {
        return destinationColumnName;
    }

    public boolean isDone() {
        return done;
    }

    public Boolean getDone() {
        return done;
    }

    public Boolean getCompleted() {
        return done;
    }
}
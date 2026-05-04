package com.fluxboard.board.task.event;
import org.springframework.context.ApplicationEvent;
import java.time.Instant;

public class TaskUpdatedEvent extends ApplicationEvent {
    private final String taskId;
    private final Instant startDate;
    private final Instant dueDate;

    public TaskUpdatedEvent(Object source, String taskId, Instant startDate, Instant dueDate) {
        super(source);
        this.taskId = taskId;
        this.startDate = startDate;
        this.dueDate = dueDate;
    }
    public String getTaskId() { return taskId; }
    public Instant getStartDate() { return startDate; }
    public Instant getDueDate() { return dueDate; }
}
package com.fluxboard.board.task.event;
import org.springframework.context.ApplicationEvent;

public class TaskDeletedEvent extends ApplicationEvent {
    private final String taskId;

    public TaskDeletedEvent(Object source, String taskId) {
        super(source);
        this.taskId = taskId;
    }
    public String getTaskId() { return taskId; }
}
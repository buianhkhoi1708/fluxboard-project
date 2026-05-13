package com.fluxboard.activity.event;

import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ActivityEvent extends ApplicationEvent {
    private final ActivitySource sourceType;
    private final String sourceId;
    private final String projectId;
    private final String boardId;
    private final String taskId;
    private final String actorUserId;
    private final ActivityAction action;
    private final String field;
    private final String oldValue;
    private final String newValue;
    private final String message;

    public ActivityEvent(Object source, ActivitySource sourceType, String sourceId, String projectId, String boardId,
                         String taskId, String actorUserId, ActivityAction action, String field, String oldValue, String newValue, String message) {
        super(source);
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.projectId = projectId;
        this.boardId = boardId;
        this.taskId = taskId;
        this.actorUserId = actorUserId;
        this.action = action;
        this.field = field;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.message = message;
    }
}

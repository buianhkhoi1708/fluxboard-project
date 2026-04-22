package com.fluxboard.activity.entity;

import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "activities")
@CompoundIndexes({
        @CompoundIndex(name = "idx_created_active", def = "{'is_deleted': 1, 'created_at': -1}"),
        @CompoundIndex(name = "idx_source_created_active", def = "{'source_type': 1, 'source_id': 1, 'created_at': -1, 'is_deleted': 1}"),
        @CompoundIndex(name = "idx_source_action_created_active", def = "{'is_deleted': 1, 'source_type': 1, 'action': 1, 'created_at': -1}"),
        @CompoundIndex(name = "idx_actor_created_active", def = "{'is_deleted': 1, 'actor_user_id': 1, 'created_at': -1}"),
        @CompoundIndex(name = "idx_project_created_active", def = "{'project_id': 1, 'created_at': -1, 'is_deleted': 1}"),
        @CompoundIndex(name = "idx_task_created_active", def = "{'task_id': 1, 'created_at': -1, 'is_deleted': 1}")
})
public class ActivityEntity extends BaseDocument {

    @Field("source_type")
    private ActivitySource sourceType;

    @Field("source_id")
    private String sourceId;

    @Field("project_id")
    private String projectId;

    @Field("board_id")
    private String boardId;

    @Field("task_id")
    private String taskId;

    @Field("actor_user_id")
    private String actorUserId;

    @Field("action")
    private ActivityAction action;

    @Field("field")
    private String field;

    @Field("old_value")
    private String oldValue;

    @Field("new_value")
    private String newValue;

    @Field("message")
    private String message;

    public ActivitySource getSourceType() {
        return sourceType;
    }

    public void setSourceType(ActivitySource sourceType) {
        this.sourceType = sourceType;
    }

    public String getSourceId() {
        return sourceId;
    }

    public void setSourceId(String sourceId) {
        this.sourceId = sourceId;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getBoardId() {
        return boardId;
    }

    public void setBoardId(String boardId) {
        this.boardId = boardId;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(String actorUserId) {
        this.actorUserId = actorUserId;
    }

    public ActivityAction getAction() {
        return action;
    }

    public void setAction(ActivityAction action) {
        this.action = action;
    }

    public String getField() {
        return field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public String getOldValue() {
        return oldValue;
    }

    public void setOldValue(String oldValue) {
        this.oldValue = oldValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public void setNewValue(String newValue) {
        this.newValue = newValue;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}

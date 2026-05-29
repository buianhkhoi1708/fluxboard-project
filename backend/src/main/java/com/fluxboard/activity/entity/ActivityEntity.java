package com.fluxboard.activity.entity;

import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.LinkedHashMap;
import java.util.Map;

@Document(collection = "activities")
@CompoundIndexes({
        @CompoundIndex(name = "idx_activity_type_created_active", def = "{'activity_type': 1, 'is_deleted': 1, 'created_at': -1}"),
        @CompoundIndex(name = "idx_created_active", def = "{'is_deleted': 1, 'created_at': -1}"),
        @CompoundIndex(name = "idx_source_created_active", def = "{'source_type': 1, 'source_id': 1, 'created_at': -1, 'is_deleted': 1}"),
        @CompoundIndex(name = "idx_source_action_created_active", def = "{'is_deleted': 1, 'source_type': 1, 'action': 1, 'created_at': -1}"),
        @CompoundIndex(name = "idx_actor_created_active", def = "{'is_deleted': 1, 'actor_user_id': 1, 'created_at': -1}"),
        @CompoundIndex(name = "idx_target_user_created_active", def = "{'is_deleted': 1, 'target_user_id': 1, 'created_at': -1}"),
        @CompoundIndex(name = "idx_project_created_active", def = "{'project_id': 1, 'created_at': -1, 'is_deleted': 1}"),
        @CompoundIndex(name = "idx_task_created_active", def = "{'task_id': 1, 'created_at': -1, 'is_deleted': 1}")
})
public class ActivityEntity extends BaseDocument {
    public enum ActivityType {
        ACTIVITY_LOG,
        ACCOUNT_MANAGEMENT,
        SECURITY_AUDIT
    }

    @Field("activity_type")
    private ActivityType activityType = ActivityType.ACTIVITY_LOG;

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

    @Field("target_user_id")
    private String targetUserId;

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

    @Field("ip_address")
    private String ipAddress;

    @Field("device_info")
    private String deviceInfo;

    @Field("metadata")
    private Map<String, Object> metadata = new LinkedHashMap<>();

    public ActivityType getActivityType() {
        return activityType;
    }

    public void setActivityType(ActivityType activityType) {
        this.activityType = activityType == null ? ActivityType.ACTIVITY_LOG : activityType;
    }

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

    public String getTargetUserId() {
        return targetUserId;
    }

    public void setTargetUserId(String targetUserId) {
        this.targetUserId = targetUserId;
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

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getDeviceInfo() {
        return deviceInfo;
    }

    public void setDeviceInfo(String deviceInfo) {
        this.deviceInfo = deviceInfo;
    }

    public Map<String, Object> getMetadata() {
        if (metadata == null) metadata = new LinkedHashMap<>();
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata == null ? new LinkedHashMap<>() : metadata;
    }
}
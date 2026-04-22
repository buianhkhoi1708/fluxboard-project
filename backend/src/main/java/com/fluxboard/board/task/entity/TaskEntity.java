package com.fluxboard.board.task.entity;

import com.fluxboard.board.task.enums.TaskPriority;
import com.fluxboard.common.entity.BaseDocument;
import java.time.Instant;
import java.util.List;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "tasks")
@CompoundIndex(
        name = "uniq_column_parent_order_active",
        def = "{'column_id': 1, 'parent_task_id': 1, 'order': 1, 'is_deleted': 1}",
        unique = true
)
public class TaskEntity extends BaseDocument {

    @Field("title")
    private String title;

    @Field("description")
    private String description;

    @Field("column_id")
    private String columnId;

    @Field("parent_task_id")
    private String parentTaskId;

    @Field("assignees_user_id")
    private List<String> assigneesUserId;

    @Field("priority")
    private TaskPriority priority;

    @Field("start_date")
    private Instant startDate;

    @Field("due_date")
    private Instant dueDate;

    @Field("status")
    private String status;

    @Field("story_point")
    private Integer storyPoint;

    @Field("estimated_date")
    private Instant estimatedDate;

    @Field("order")
    private int order;

    @Field("ai_suggested_point")
    private Integer aiSuggestedPoint;

    @Field("ai_estimated_reason")
    private String aiEstimatedReason;

    @Field("author_user_id")
    private String authorUserId;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getColumnId() {
        return columnId;
    }

    public void setColumnId(String columnId) {
        this.columnId = columnId;
    }

    public String getParentTaskId() {
        return parentTaskId;
    }

    public void setParentTaskId(String parentTaskId) {
        this.parentTaskId = parentTaskId;
    }

    public List<String> getAssigneesUserId() {
        return assigneesUserId;
    }

    public void setAssigneesUserId(List<String> assigneesUserId) {
        this.assigneesUserId = assigneesUserId;
    }

    public TaskPriority getPriority() {
        return priority;
    }

    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }

    public Instant getStartDate() {
        return startDate;
    }

    public void setStartDate(Instant startDate) {
        this.startDate = startDate;
    }

    public Instant getDueDate() {
        return dueDate;
    }

    public void setDueDate(Instant dueDate) {
        this.dueDate = dueDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getStoryPoint() {
        return storyPoint;
    }

    public void setStoryPoint(Integer storyPoint) {
        this.storyPoint = storyPoint;
    }

    public Instant getEstimatedDate() {
        return estimatedDate;
    }

    public void setEstimatedDate(Instant estimatedDate) {
        this.estimatedDate = estimatedDate;
    }

    public int getOrder() {
        return order;
    }

    public void setOrder(int order) {
        this.order = order;
    }

    public Integer getAiSuggestedPoint() {
        return aiSuggestedPoint;
    }

    public void setAiSuggestedPoint(Integer aiSuggestedPoint) {
        this.aiSuggestedPoint = aiSuggestedPoint;
    }

    public String getAiEstimatedReason() {
        return aiEstimatedReason;
    }

    public void setAiEstimatedReason(String aiEstimatedReason) {
        this.aiEstimatedReason = aiEstimatedReason;
    }

    public String getAuthorUserId() {
        return authorUserId;
    }

    public void setAuthorUserId(String authorUserId) {
        this.authorUserId = authorUserId;
    }
}

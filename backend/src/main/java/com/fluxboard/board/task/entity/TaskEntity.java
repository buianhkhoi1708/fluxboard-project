package com.fluxboard.board.task.entity;

import com.fluxboard.common.entity.BaseDocument;
import java.util.List;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "tasks")
@CompoundIndex(name = "idx_project_task_code", def = "{'project_id': 1, 'task_code': 1}")
@CompoundIndex(name = "idx_board_list_position", def = "{'board_id': 1, 'list_id': 1, 'position': 1}")
public class TaskEntity extends BaseDocument {

    @Field("task_code")
    private String taskCode;

    @Field("project_id")
    private String projectId;

    @Field("board_id")
    private String boardId;

    @Field("list_id")
    private String listId;

    @Field("sprint_id")
    private String sprintId;

    @Field("parent_task_id")
    private String parentTaskId;

    @Field("reporter_user_id")
    private String reporterUserId;

    @Field("assignee_ids")
    private List<String> assigneeIds;

    @Field("label_ids")
    private List<String> labelIds;

    @Field("status")
    private String status;

    @Field("priority")
    private String priority;

    @Field("position")
    private int position;

    public String getTaskCode() {
        return taskCode;
    }

    public void setTaskCode(String taskCode) {
        this.taskCode = taskCode;
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

    public String getListId() {
        return listId;
    }

    public void setListId(String listId) {
        this.listId = listId;
    }

    public String getSprintId() {
        return sprintId;
    }

    public void setSprintId(String sprintId) {
        this.sprintId = sprintId;
    }

    public String getParentTaskId() {
        return parentTaskId;
    }

    public void setParentTaskId(String parentTaskId) {
        this.parentTaskId = parentTaskId;
    }

    public String getReporterUserId() {
        return reporterUserId;
    }

    public void setReporterUserId(String reporterUserId) {
        this.reporterUserId = reporterUserId;
    }

    public List<String> getAssigneeIds() {
        return assigneeIds;
    }

    public void setAssigneeIds(List<String> assigneeIds) {
        this.assigneeIds = assigneeIds;
    }

    public List<String> getLabelIds() {
        return labelIds;
    }

    public void setLabelIds(List<String> labelIds) {
        this.labelIds = labelIds;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}

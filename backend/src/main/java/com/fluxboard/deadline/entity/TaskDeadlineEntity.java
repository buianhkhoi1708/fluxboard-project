package com.fluxboard.deadline.entity;

import com.fluxboard.common.entity.BaseDocument;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = "task_deadlines")
@CompoundIndex(name = "status_due_date_idx", def = "{'status': 1, 'due_date': 1}")
public class TaskDeadlineEntity extends BaseDocument {

    @Indexed(unique = true)
    @Field("task_id")
    private String taskId;

    @Field("start_date")
    private Instant startDate;

    @Field("due_date")
    private Instant dueDate;

    @Field("actual_completed_at")
    private Instant actualCompletedAt;

    @Field("reminder_offset")
    private Integer reminderOffset;

    @Field("status")
    private DeadlineStatus status;

    @Field("extension_count")
    private Integer extensionCount = 0;

    @Field("extension_limit")
    private Integer extensionLimit;

    @Field("is_reminder_sent")
    private Boolean isReminderSent = false;

    @Field("is_extension_pending")
    private Boolean isExtensionPending = false;

    @Field("pending_requested_date")
    private Instant pendingRequestedDate;

    public enum DeadlineStatus { 
        ON_TRACK, 
        AT_RISK, 
        OVERDUE, 
        LATE 
    }
}
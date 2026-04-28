package com.fluxboard.deadline.service;

import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.deadline.entity.TaskDeadlineEntity;
import com.fluxboard.deadline.event.DeadlineExtendedEvent;
import com.fluxboard.deadline.event.DeadlineConfigChangedEvent;
import com.fluxboard.deadline.repository.TaskDeadlineRepository;
import com.fluxboard.notification.service.NotificationDispatcher;
import com.fluxboard.rbac.service.PermissionEvaluatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TaskDeadlineService {
    
    private final TaskDeadlineRepository deadlineRepository;
    private final TaskRepository taskRepository;
    private final BoardColumnRepository columnRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationDispatcher notificationDispatcher;
    private final PermissionEvaluatorService permissionEvaluatorService;

    private void validateTaskAccess(TaskEntity task, String userId) {
        boolean isAssignee = task.getAssigneesUserId() != null && task.getAssigneesUserId().contains(userId);
        if (!isAssignee) {
            throw new AppException(ErrorCode.FORBIDDEN, "User is not assigned to this task.");
        }
    }

    private void validateManagerAccess(String projectId, String userId) {
        String roleId = "USER_ROLE_ID_IN_PROJECT"; 

        boolean hasAccess = permissionEvaluatorService.hasPermission(roleId, "TASK_DEADLINE_CONFIG");
        
        if (!hasAccess) {
            throw new AppException(ErrorCode.FORBIDDEN, "Access denied. Your role does not have permission to configure deadlines.");
        }
    }

    private void validateDeadlineConfigData(Instant currentStartDate, Instant currentDueDate, Instant newStartDate, Instant newDueDate, Integer reminderOffset, Integer extensionLimit) {
        if (reminderOffset != null && reminderOffset < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Reminder offset must be a non-negative integer.");
        }

        if (extensionLimit != null && extensionLimit < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Extension limit must be a non-negative integer.");
        }

        Instant effectiveStartDate = newStartDate != null ? newStartDate : currentStartDate;
        Instant effectiveDueDate = newDueDate != null ? newDueDate : currentDueDate;

        if (effectiveStartDate != null && effectiveDueDate != null && !effectiveStartDate.isBefore(effectiveDueDate)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Start date must be strictly before due date.");
        }
    }

    @Transactional
    public Map<String, Object> updateDeadlineConfig(String taskId, String userId, Instant startDate, Instant dueDate, Integer reminderOffset, Integer extensionLimit) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));

        validateManagerAccess(task.getProjectId(), userId);

        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        validateDeadlineConfigData(deadline.getStartDate(), deadline.getDueDate(), startDate, dueDate, reminderOffset, extensionLimit);

        Instant oldDueDate = deadline.getDueDate();
        boolean isDueDateChanged = dueDate != null && !dueDate.equals(oldDueDate);

        if (startDate != null) deadline.setStartDate(startDate);
        if (dueDate != null) deadline.setDueDate(dueDate);
        if (reminderOffset != null) deadline.setReminderOffset(reminderOffset);
        if (extensionLimit != null) deadline.setExtensionLimit(extensionLimit);
        deadlineRepository.save(deadline);

        if (startDate != null) task.setStartDate(startDate);
        if (dueDate != null) task.setDueDate(dueDate);
        taskRepository.save(task);

        notificationDispatcher.scheduleDeadlineUpdateNotification(taskId);

        if (isDueDateChanged) {
            eventPublisher.publishEvent(new DeadlineConfigChangedEvent(
                    this, taskId, userId, oldDueDate, dueDate
            ));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", taskId);
        result.put("start_date", deadline.getStartDate());
        result.put("due_date", deadline.getDueDate());
        result.put("reminder_offset", deadline.getReminderOffset());
        result.put("status", deadline.getStatus() != null ? deadline.getStatus().name() : "ON_TRACK");
        result.put("extension_limit", deadline.getExtensionLimit());
        result.put("extension_count", deadline.getExtensionCount());
        return result;
    }

    @Transactional
    public Map<String, Object> completeTaskKPI(String taskId, String userId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));
        
        validateTaskAccess(task, userId);

        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        Instant now = Instant.now();
        deadline.setActualCompletedAt(now);
        
        boolean isLate = deadline.getDueDate() != null && now.isAfter(deadline.getDueDate());
        deadline.setStatus(isLate ? TaskDeadlineEntity.DeadlineStatus.LATE : TaskDeadlineEntity.DeadlineStatus.COMPLETED);
        deadlineRepository.save(deadline);

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", taskId);
        result.put("due_date", deadline.getDueDate());
        result.put("actual_completed_at", now);
        result.put("is_late", isLate);
        result.put("late_duration", isLate ? Duration.between(deadline.getDueDate(), now).toHours() + " hours" : "0 hours");
        return result;
    }

    @Transactional
    public Map<String, Object> extendDeadline(String taskId, String userId, Instant requestedDueDate, String reason) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));
        
        validateTaskAccess(task, userId);

        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        if (deadline.getExtensionLimit() != null && deadline.getExtensionCount() >= deadline.getExtensionLimit()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Deadline extension limit reached.");
        }

        Instant oldDueDate = deadline.getDueDate();
        deadline.setDueDate(requestedDueDate);
        deadline.setExtensionCount(deadline.getExtensionCount() + 1);
        deadline.setStatus(TaskDeadlineEntity.DeadlineStatus.ON_TRACK);
        deadlineRepository.save(deadline);

        task.setDueDate(requestedDueDate);
        taskRepository.save(task);

        String boardId = null;
        if (task.getColumnId() != null) {
            Optional<BoardColumnEntity> columnOpt = columnRepository.findById(task.getColumnId());
            if (columnOpt.isPresent()) {
                boardId = columnOpt.get().getBoardId();
            }
        }

        eventPublisher.publishEvent(new DeadlineExtendedEvent(
                this, 
                taskId, 
                task.getProjectId(), 
                boardId, 
                userId, 
                oldDueDate, 
                requestedDueDate, 
                reason
        ));

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", taskId);
        result.put("old_due_date", oldDueDate);
        result.put("new_due_date", requestedDueDate);
        result.put("extension_count", deadline.getExtensionCount());
        result.put("extension_limit", deadline.getExtensionLimit());
        return result;
    }
}
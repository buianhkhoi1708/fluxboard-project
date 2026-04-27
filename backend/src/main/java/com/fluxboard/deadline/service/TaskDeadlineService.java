package com.fluxboard.deadline.service;

import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.deadline.entity.TaskDeadlineEntity;
import com.fluxboard.deadline.event.DeadlineExtendedEvent;
import com.fluxboard.deadline.repository.TaskDeadlineRepository;
import com.fluxboard.notification.service.NotificationDispatcher;
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
    
    // TIÊM MODULE THÔNG BÁO VÀO ĐÂY
    private final NotificationDispatcher notificationDispatcher;

    private void validateTaskAccess(TaskEntity task, String userId) {
        boolean isAssignee = task.getAssigneesUserId() != null && task.getAssigneesUserId().contains(userId);
        if (!isAssignee) {
            throw new AppException(ErrorCode.FORBIDDEN, "User is not assigned to this task.");
        }
    }

    @Transactional
    public Map<String, Object> updateDeadlineConfig(String taskId, Instant startDate, Instant dueDate, Integer reminderOffset, Integer extensionLimit) {
        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        if (startDate != null) deadline.setStartDate(startDate);
        if (dueDate != null) deadline.setDueDate(dueDate);
        if (reminderOffset != null) deadline.setReminderOffset(reminderOffset);
        if (extensionLimit != null) deadline.setExtensionLimit(extensionLimit);
        
        deadlineRepository.save(deadline);

        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task != null) {
            if (startDate != null) task.setStartDate(startDate);
            if (dueDate != null) task.setDueDate(dueDate);
            taskRepository.save(task);

            // GỌI HÀM CÀI ĐỒNG HỒ ĐẾM NGƯỢC 10 PHÚT
            notificationDispatcher.scheduleDeadlineUpdateNotification(taskId);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", taskId);
        result.put("start_date", deadline.getStartDate());
        result.put("due_date", deadline.getDueDate());
        result.put("reminder_offset", deadline.getReminderOffset());
        result.put("status", deadline.getStatus() != null ? deadline.getStatus().name() : null);
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
package com.fluxboard.deadline.service;

import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.deadline.entity.TaskDeadlineEntity;
import com.fluxboard.deadline.event.DeadlineConfigChangedEvent;
import com.fluxboard.deadline.event.ExtensionApprovedEvent;
import com.fluxboard.deadline.event.ExtensionRejectedEvent;
import com.fluxboard.deadline.event.ExtensionRequestedEvent;
import com.fluxboard.deadline.event.TaskCompletedLateEvent;
import com.fluxboard.deadline.repository.TaskDeadlineRepository;
import com.fluxboard.notification.service.NotificationDispatcher;
import com.fluxboard.rbac.service.PermissionEvaluatorService;

import com.fluxboard.project.projectmember.entity.ProjectMember; 
import com.fluxboard.project.projectmember.repository.ProjectMemberRepository; 

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TaskDeadlineService {
    
    private final TaskDeadlineRepository deadlineRepository;
    private final TaskRepository taskRepository;
    private final BoardColumnRepository columnRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationDispatcher notificationDispatcher;
    private final PermissionEvaluatorService permissionEvaluatorService;
    private final ProjectMemberRepository projectMemberRepository; 

    private void validateTaskAccess(TaskEntity task, String userId) {
        boolean isAssignee = task.getAssigneesUserId() != null && task.getAssigneesUserId().contains(userId);
        if (!isAssignee) {
            throw new AppException(ErrorCode.FORBIDDEN, "User is not assigned to this task.");
        }
    }

    private void validateManagerAccess(String projectId, String userId) {
        // Đã sửa tên hàm repository thành findByProjectIdAndUserIdAndDeletedFalse
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserIdAndDeletedFalse(projectId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Access denied. You are not a member of this project."));
        
        // Đã sửa getter thành isActive()
        if (!member.isActive()) {
            throw new AppException(ErrorCode.FORBIDDEN, "Access denied. Your account is suspended in this project.");
        }

        boolean hasAccess = false;
        List<String> userRoleIdsInProject = member.getRoleIds();
        if (userRoleIdsInProject != null) {
            for (String roleId : userRoleIdsInProject) {
                if (permissionEvaluatorService.hasPermission(roleId, "TASK_DEADLINE_CONFIG")) {
                    hasAccess = true;
                    break;
                }
            }
        }
        
        if (!hasAccess) {
            throw new AppException(ErrorCode.FORBIDDEN, "Access denied. None of your roles have permission to configure deadlines.");
        }
    }

    private void validateStatusUpdateAccess(String projectId, String userId) {
        // Đã sửa tên hàm repository thành findByProjectIdAndUserIdAndDeletedFalse
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserIdAndDeletedFalse(projectId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Access denied. You are not a member of this project."));

        // Đã sửa getter thành isActive()
        if (!member.isActive()) {
            throw new AppException(ErrorCode.FORBIDDEN, "The account has been suspended from this project.");
        }

        boolean hasPermission = false;
        List<String> userRoleIdsInProject = member.getRoleIds();
        if (userRoleIdsInProject != null) {
            for (String roleId : userRoleIdsInProject) {
                if (permissionEvaluatorService.hasPermission(roleId, "TASK_MOVE")) {
                    hasPermission = true;
                    break;
                }
            }
        }

        if (!hasPermission) {
            throw new AppException(ErrorCode.FORBIDDEN, "You do not have permission to update the task status in this project.");
        }
    }

    private TaskDeadlineEntity.DeadlineStatus calculateDynamicStatus(TaskDeadlineEntity deadline) {
        if (deadline.getActualCompletedAt() != null) {
            if (deadline.getDueDate() != null && deadline.getActualCompletedAt().isAfter(deadline.getDueDate())) {
                return TaskDeadlineEntity.DeadlineStatus.LATE;
            }
            return TaskDeadlineEntity.DeadlineStatus.ON_TRACK;
        }
        
        Instant now = Instant.now();
        Instant dueDate = deadline.getDueDate();
        
        if (dueDate == null) return TaskDeadlineEntity.DeadlineStatus.ON_TRACK;
        
        if (now.isAfter(dueDate)) return TaskDeadlineEntity.DeadlineStatus.OVERDUE;
        
        if (now.isAfter(dueDate.minus(Duration.ofHours(24)))) {
            return TaskDeadlineEntity.DeadlineStatus.AT_RISK;
        }
        
        return TaskDeadlineEntity.DeadlineStatus.ON_TRACK;
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
        
        deadline.setStatus(calculateDynamicStatus(deadline));
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
        result.put("status", deadline.getStatus().name());
        result.put("extension_limit", deadline.getExtensionLimit());
        result.put("extension_count", deadline.getExtensionCount());
        return result;
    }

    @Transactional
    public Map<String, Object> completeTaskKPI(String taskId, String userId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));
        
        validateTaskAccess(task, userId);
        validateStatusUpdateAccess(task.getProjectId(), userId);

        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        Instant now = Instant.now();
        deadline.setActualCompletedAt(now);
        
        TaskDeadlineEntity.DeadlineStatus finalStatus = calculateDynamicStatus(deadline);
        deadline.setStatus(finalStatus);
        deadlineRepository.save(deadline);

        boolean isLate = (finalStatus == TaskDeadlineEntity.DeadlineStatus.LATE);

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", taskId);
        result.put("due_date", deadline.getDueDate());
        result.put("actual_completed_at", now);
        result.put("is_late", isLate);
        
        if (isLate && deadline.getDueDate() != null) {
            Duration lateDuration = Duration.between(deadline.getDueDate(), now);
            long totalMinutes = lateDuration.toMinutes();
            long hours = lateDuration.toHours();
            long minutesPart = lateDuration.toMinutesPart();
            
            result.put("late_duration_formatted", hours + "h " + minutesPart + "m");
            result.put("late_duration_minutes", totalMinutes);

            eventPublisher.publishEvent(new TaskCompletedLateEvent(
                    this, taskId, userId, task.getProjectId(), totalMinutes
            ));
        } else {
            result.put("late_duration_formatted", "0h 0m");
            result.put("late_duration_minutes", 0);
        }
        
        return result;
    }

    @Transactional
    public Map<String, Object> requestExtension(String taskId, String userId, Instant requestedDueDate, String reason) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));
        
        validateTaskAccess(task, userId);

        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        if (Boolean.TRUE.equals(deadline.getIsExtensionPending())) {
            throw new AppException(ErrorCode.CONFLICT, "An extension request is already pending for this task.");
        }

        if (deadline.getExtensionLimit() != null && deadline.getExtensionCount() >= deadline.getExtensionLimit()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Deadline extension limit reached.");
        }

        deadline.setIsExtensionPending(true);
        deadline.setPendingRequestedDate(requestedDueDate);
        deadlineRepository.save(deadline);

        String targetManagerId = task.getAuthorUserId();

        eventPublisher.publishEvent(new ExtensionRequestedEvent(
                this, taskId, task.getProjectId(), userId, targetManagerId, 
                deadline.getDueDate(), requestedDueDate, reason
        ));

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", taskId);
        result.put("status", "PENDING_APPROVAL");
        result.put("requested_due_date", requestedDueDate);
        return result;
    }

    @Transactional
    public Map<String, Object> approveExtension(String taskId, String managerId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));
        
        validateManagerAccess(task.getProjectId(), managerId);

        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        if (!Boolean.TRUE.equals(deadline.getIsExtensionPending()) || deadline.getPendingRequestedDate() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "No pending extension request found.");
        }

        Instant oldDueDate = deadline.getDueDate();
        Instant newDueDate = deadline.getPendingRequestedDate();

        deadline.setDueDate(newDueDate);
        deadline.setExtensionCount(deadline.getExtensionCount() + 1);
        deadline.setIsExtensionPending(false);
        deadline.setPendingRequestedDate(null);
        deadline.setStatus(calculateDynamicStatus(deadline));
        deadlineRepository.save(deadline);

        task.setDueDate(newDueDate);
        taskRepository.save(task);

        eventPublisher.publishEvent(new ExtensionApprovedEvent(
                this, taskId, task.getProjectId(), managerId, 
                task.getAssigneesUserId(), oldDueDate, newDueDate
        ));

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", taskId);
        result.put("old_due_date", oldDueDate);
        result.put("new_due_date", newDueDate);
        result.put("extension_count", deadline.getExtensionCount());
        result.put("status", "APPROVED");
        return result;
    }

    @Transactional
    public Map<String, Object> rejectExtension(String taskId, String managerId, String reason) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));
        
        validateManagerAccess(task.getProjectId(), managerId);

        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        if (!Boolean.TRUE.equals(deadline.getIsExtensionPending())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "No pending extension request found.");
        }

        deadline.setIsExtensionPending(false);
        deadline.setPendingRequestedDate(null);
        deadlineRepository.save(deadline);

        eventPublisher.publishEvent(new ExtensionRejectedEvent(
                this, taskId, task.getAssigneesUserId(), deadline.getDueDate(), reason
        ));

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", taskId);
        result.put("current_due_date", deadline.getDueDate());
        result.put("status", "REJECTED");
        return result;
    }
}
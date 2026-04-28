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
import com.fluxboard.deadline.event.TaskCompletedLateEvent;
import com.fluxboard.deadline.repository.TaskDeadlineRepository;
import com.fluxboard.notification.service.NotificationDispatcher;
import com.fluxboard.rbac.service.PermissionEvaluatorService;

// TODO: Mở comment dòng dưới khi đồng đội hoàn thành file ProjectMemberRepository
// import com.fluxboard.project.repository.ProjectMemberRepository; 

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
    
    // TODO: Mở comment dòng dưới khi đồng đội làm xong phần Project
    // private final ProjectMemberRepository projectMemberRepository; 

    private void validateTaskAccess(TaskEntity task, String userId) {
        boolean isAssignee = task.getAssigneesUserId() != null && task.getAssigneesUserId().contains(userId);
        if (!isAssignee) {
            throw new AppException(ErrorCode.FORBIDDEN, "User is not assigned to this task.");
        }
    }

    private void validateManagerAccess(String projectId, String userId) {
        // =====================================================================
        // ⚠️ BẮT ĐẦU ĐOẠN CODE TẠM THỜI (XÓA SAU KHI CHẠY MẪU THÀNH CÔNG)
        // =====================================================================
        java.util.List<String> userRoleIdsInProject = java.util.List.of("69cfd39a34353f3ca08d52ce"); 
        boolean isActive = true;
        // =====================================================================

        /* // =====================================================================
        // 🟢 BẮT ĐẦU ĐOẠN CODE CHÍNH THỨC (MỞ COMMENT KHI ĐỒNG ĐỘI LÀM XONG)
        // =====================================================================
        com.fluxboard.project.entity.ProjectMemberEntity member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Access denied. You are not a member of this project."));
        
        java.util.List<String> userRoleIdsInProject = member.getRoleIds();
        boolean isActive = member.getIsActive() != null ? member.getIsActive() : false;
        // =====================================================================
        */

        if (!isActive) {
            throw new AppException(ErrorCode.FORBIDDEN, "Access denied. Your account is suspended in this project.");
        }

        boolean hasAccess = false;
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
        // =====================================================================
        // ⚠️ BẮT ĐẦU ĐOẠN CODE TẠM THỜI
        // =====================================================================
        java.util.List<String> userRoleIdsInProject = java.util.List.of("69cfd39a34353f3ca08d52ce"); 
        boolean isActive = true;
        // =====================================================================

        /* // =====================================================================
        // 🟢 BẮT ĐẦU ĐOẠN CODE CHÍNH THỨC
        // =====================================================================
        com.fluxboard.project.entity.ProjectMemberEntity member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Access denied."));
        java.util.List<String> userRoleIdsInProject = member.getRoleIds();
        boolean isActive = member.getIsActive() != null ? member.getIsActive() : false;
        // =====================================================================
        */

        if (!isActive) throw new AppException(ErrorCode.FORBIDDEN, "The account has been suspended from this project.");

        boolean hasPermission = false;
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
        deadline.setStatus(calculateDynamicStatus(deadline));
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
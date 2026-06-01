package com.fluxboard.deadline.service;

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
import com.fluxboard.organization.department.entity.DepartmentEntity;
import com.fluxboard.organization.department.repository.DepartmentRepository;
import com.fluxboard.organization.team.entity.TeamEntity;
import com.fluxboard.organization.team.repository.TeamRepository;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.projectmember.entity.ProjectMember;
import com.fluxboard.project.projectmember.repository.ProjectMemberRepository;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.rbac.service.PermissionEvaluatorService;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TaskDeadlineService {
    private static final Duration EXTENSION_REVIEW_TIMEOUT = Duration.ofDays(3);
    private static final String SYSTEM_AUTO_REJECT = "SYSTEM_AUTO_REJECT";

    private final TaskDeadlineRepository deadlineRepository;
    private final TaskRepository taskRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationDispatcher notificationDispatcher;
    private final PermissionEvaluatorService permissionEvaluatorService;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    public Map<String, Object> getDeadlineByTask(String taskId) {
        TaskDeadlineEntity deadline = deadlineRepository.findActiveByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));
        return toResponse(deadline);
    }

    private void validateTaskAccess(TaskEntity task, String userId) {
        boolean assigned = task.getAssigneesUserId() != null && task.getAssigneesUserId().contains(userId);
        if (!assigned) throw new AppException(ErrorCode.FORBIDDEN, "User is not assigned to this task.");
    }

    private void validateManagerAccess(String projectId, String userId) {
        ProjectEntity project = projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));

        if (same(project.getOwnerId(), userId)) return;

        if (project.getDepartmentId() != null) {
            Optional<DepartmentEntity> departmentOpt = departmentRepository.findByIdAndDeletedFalse(project.getDepartmentId());
            if (departmentOpt.isPresent() && same(departmentOpt.get().getManagerId(), userId)) return;

            List<TeamEntity> teams = teamRepository.findByDepartmentIdAndDeletedFalse(project.getDepartmentId());
            boolean isTeamLead = teams.stream().anyMatch(team -> same(team.getLeadId(), userId));
            if (isTeamLead) return;
        }

        ProjectMember member = projectMemberRepository.findActiveByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Access denied. You are not an active member of this project."));

        boolean hasPermission = member.getRoleIds() != null && member.getRoleIds().stream()
                .anyMatch(roleId -> permissionEvaluatorService.hasPermission(roleId, "TASK_DEADLINE_CONFIG"));

        if (!hasPermission) {
            throw new AppException(ErrorCode.FORBIDDEN, "Access denied. You do not have permission to configure deadlines.");
        }
    }

    private void validateExtensionReviewerAccess(TaskEntity task, String reviewerId) {
        if (same(task.getAuthorUserId(), reviewerId)) return;

        ProjectEntity project = projectRepository.findByIdAndDeletedFalse(task.getProjectId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));

        if (same(project.getOwnerId(), reviewerId)) return;

        validateManagerAccess(task.getProjectId(), reviewerId);
    }

    private TaskDeadlineEntity.DeadlineStatus calculateDynamicStatus(TaskDeadlineEntity deadline) {
        if (deadline.getActualCompletedAt() != null) {
            return deadline.getDueDate() != null && deadline.getActualCompletedAt().isAfter(deadline.getDueDate())
                    ? TaskDeadlineEntity.DeadlineStatus.LATE
                    : TaskDeadlineEntity.DeadlineStatus.ON_TRACK;
        }

        Instant now = Instant.now();
        Instant due = deadline.getDueDate();

        if (due == null) return TaskDeadlineEntity.DeadlineStatus.ON_TRACK;
        if (now.isAfter(due)) return TaskDeadlineEntity.DeadlineStatus.OVERDUE;
        return now.isAfter(due.minus(Duration.ofHours(24)))
                ? TaskDeadlineEntity.DeadlineStatus.AT_RISK
                : TaskDeadlineEntity.DeadlineStatus.ON_TRACK;
    }

    private void validateDeadlineConfigData(
            Instant currentStart,
            Instant currentDue,
            Instant newStart,
            Instant newDue,
            Integer reminderOffset,
            Integer extensionLimit
    ) {
        if (reminderOffset != null && reminderOffset < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Reminder offset must be a non-negative integer.");
        }

        if (extensionLimit != null && extensionLimit < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Extension limit must be a non-negative integer.");
        }

        Instant start = newStart != null ? newStart : currentStart;
        Instant due = newDue != null ? newDue : currentDue;

        if (start != null && due != null && !start.isBefore(due)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Start date must be strictly before due date.");
        }
    }

    @Transactional
    public Map<String, Object> updateDeadlineConfig(
            String taskId,
            String userId,
            Instant startDate,
            Instant dueDate,
            Integer reminderOffset,
            Integer extensionLimit
    ) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));

        validateManagerAccess(task.getProjectId(), userId);

        TaskDeadlineEntity deadline = deadlineRepository.findActiveByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        validateDeadlineConfigData(
                deadline.getStartDate(),
                deadline.getDueDate(),
                startDate,
                dueDate,
                reminderOffset,
                extensionLimit
        );

        Instant oldDueDate = deadline.getDueDate();
        boolean dueChanged = dueDate != null && !dueDate.equals(oldDueDate);

        if (startDate != null) deadline.setStartDate(startDate);
        if (dueDate != null) {
            deadline.setDueDate(dueDate);
            deadline.setIsReminderSent(false);
        }
        if (reminderOffset != null) deadline.setReminderOffset(reminderOffset);
        if (extensionLimit != null) deadline.setExtensionLimit(extensionLimit);

        deadline.setStatus(calculateDynamicStatus(deadline));
        deadlineRepository.save(deadline);

        if (startDate != null) task.setStartDate(startDate);
        if (dueDate != null) task.setDueDate(dueDate);
        taskRepository.save(task);

        notificationDispatcher.scheduleDeadlineUpdateNotification(taskId);

        if (dueChanged) {
            eventPublisher.publishEvent(new DeadlineConfigChangedEvent(this, taskId, userId, oldDueDate, dueDate));
        }

        return toResponse(deadline);
    }

    @Transactional
    public Map<String, Object> completeTaskKPI(String taskId, String userId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));

        validateTaskAccess(task, userId);

        TaskDeadlineEntity deadline = deadlineRepository.findActiveByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        Instant now = Instant.now();
        deadline.setActualCompletedAt(now);

        TaskDeadlineEntity.DeadlineStatus finalStatus = calculateDynamicStatus(deadline);
        deadline.setStatus(finalStatus);
        deadlineRepository.save(deadline);

        boolean late = finalStatus == TaskDeadlineEntity.DeadlineStatus.LATE;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("task_id", taskId);
        result.put("due_date", deadline.getDueDate());
        result.put("actual_completed_at", now);
        result.put("is_late", late);

        if (late && deadline.getDueDate() != null) {
            Duration duration = Duration.between(deadline.getDueDate(), now);
            long totalMinutes = duration.toMinutes();

            result.put("late_duration_formatted", duration.toHours() + "h " + duration.toMinutesPart() + "m");
            result.put("late_duration_minutes", totalMinutes);

            eventPublisher.publishEvent(
                    new TaskCompletedLateEvent(this, taskId, userId, task.getProjectId(), totalMinutes)
            );
        } else {
            result.put("late_duration_formatted", "0h 0m");
            result.put("late_duration_minutes", 0);
        }

        return result;
    }

    @Transactional
    public Map<String, Object> requestExtension(
            String taskId,
            String userId,
            Instant requestedDueDate,
            String reason
    ) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));

        validateTaskAccess(task, userId);

        TaskDeadlineEntity deadline = deadlineRepository.findActiveByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        if (requestedDueDate == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "New deadline is required.");
        }

        if (deadline.getDueDate() != null && !requestedDueDate.isAfter(deadline.getDueDate())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "New deadline must be after current deadline.");
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Extension reason is required.");
        }

        if (Boolean.TRUE.equals(deadline.getIsExtensionPending())) {
            throw new AppException(ErrorCode.CONFLICT, "An extension request is already pending for this task.");
        }

        int used = deadline.getExtensionCount() == null ? 0 : deadline.getExtensionCount();
        int limit = deadline.getExtensionLimit() == null ? 2 : deadline.getExtensionLimit();

        if (used >= limit) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Deadline extension limit reached.");
        }

        String cleanReason = reason.trim();
        String targetReviewerId = resolveTargetReviewerId(task, userId);
        Instant requestedAt = Instant.now();

        deadline.setIsExtensionPending(true);
        deadline.setPendingRequestedDate(requestedDueDate);
        deadline.setExtensionStatus(TaskDeadlineEntity.ExtensionStatus.PENDING);
        deadline.setExtensionRequestedBy(userId);
        deadline.setExtensionRequestedAt(requestedAt);
        deadline.setExtensionReason(cleanReason);
        deadline.setExtensionReviewedBy(null);
        deadline.setExtensionReviewedAt(null);
        deadline.setExtensionRejectReason(null);
        deadlineRepository.save(deadline);

        eventPublisher.publishEvent(
                new ExtensionRequestedEvent(
                        this,
                        taskId,
                        task.getProjectId(),
                        userId,
                        targetReviewerId,
                        deadline.getDueDate(),
                        requestedDueDate,
                        cleanReason
                )
        );

        Map<String, Object> result = toResponse(deadline);
        result.put("target_manager_id", targetReviewerId);
        result.put("target_reviewer_id", targetReviewerId);
        result.put("status", "PENDING_APPROVAL");
        result.put("extension_expires_at", requestedAt.plus(EXTENSION_REVIEW_TIMEOUT));
        return result;
    }

    @Transactional
    public Map<String, Object> approveExtension(String taskId, String reviewerId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));

        validateExtensionReviewerAccess(task, reviewerId);

        TaskDeadlineEntity deadline = deadlineRepository.findActiveByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        if (!Boolean.TRUE.equals(deadline.getIsExtensionPending()) || deadline.getPendingRequestedDate() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "No pending extension request found.");
        }

        Instant oldDueDate = deadline.getDueDate();
        Instant newDueDate = deadline.getPendingRequestedDate();
        String requesterId = deadline.getExtensionRequestedBy();
        String requestReason = deadline.getExtensionReason();

        // 1. Cập nhật Deadline Record
        deadline.setDueDate(newDueDate);
        deadline.setExtensionCount((deadline.getExtensionCount() == null ? 0 : deadline.getExtensionCount()) + 1);
        deadline.setIsExtensionPending(false);
        deadline.setPendingRequestedDate(null);
        deadline.setExtensionStatus(TaskDeadlineEntity.ExtensionStatus.APPROVED);
        deadline.setExtensionReviewedBy(reviewerId);
        deadline.setExtensionReviewedAt(Instant.now());
        deadline.setExtensionRejectReason(null);
        deadline.setIsReminderSent(false);
        deadline.setStatus(calculateDynamicStatus(deadline));
        deadlineRepository.save(deadline);

        // 2. Cập nhật TaskEntity
        task.setDueDate(newDueDate);
        taskRepository.save(task); // ĐÃ LƯU NGÀY MỚI VÀO DB

        // 3. Bắn Event cho hệ thống Log / Noti
        eventPublisher.publishEvent(
                new ExtensionApprovedEvent(
                        this,
                        taskId,
                        task.getProjectId(),
                        reviewerId,
                        resolveTargets(requesterId, task),
                        oldDueDate,
                        newDueDate,
                        requestReason,
                        requesterId
                )
        );

        // 4. Trả về Response
        Map<String, Object> result = toResponse(deadline);
        result.put("old_due_date", oldDueDate);
        result.put("new_due_date", newDueDate);
        result.put("status", "APPROVED");
        return result;
    }
    @Transactional
    public Map<String, Object> rejectExtension(String taskId, String reviewerId, String reason) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));

        validateExtensionReviewerAccess(task, reviewerId);

        TaskDeadlineEntity deadline = deadlineRepository.findActiveByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        return rejectPendingExtension(task, deadline, reviewerId, reason, false);
    }

    @Transactional
    public Map<String, Object> autoRejectExpiredExtension(String taskId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));

        TaskDeadlineEntity deadline = deadlineRepository.findActiveByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing."));

        if (!Boolean.TRUE.equals(deadline.getIsExtensionPending())) {
            Map<String, Object> result = toResponse(deadline);
            result.put("status", "NO_PENDING_EXTENSION");
            return result;
        }

        Instant requestedAt = deadline.getExtensionRequestedAt();

        if (requestedAt != null && requestedAt.plus(EXTENSION_REVIEW_TIMEOUT).isAfter(Instant.now())) {
            Map<String, Object> result = toResponse(deadline);
            result.put("status", "NOT_EXPIRED");
            return result;
        }

        return rejectPendingExtension(
                task,
                deadline,
                SYSTEM_AUTO_REJECT,
                "Yêu cầu dời deadline đã quá hạn 3 ngày nên hệ thống tự động từ chối.",
                true
        );
    }

    private Map<String, Object> rejectPendingExtension(
            TaskEntity task,
            TaskDeadlineEntity deadline,
            String reviewerId,
            String reason,
            boolean autoRejected
    ) {
        if (!Boolean.TRUE.equals(deadline.getIsExtensionPending())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "No pending extension request found.");
        }

        String taskId = task.getId();
        String requesterId = deadline.getExtensionRequestedBy();
        Instant currentDueDate = deadline.getDueDate();
        Instant requestedDueDate = deadline.getPendingRequestedDate();
        String requestReason = deadline.getExtensionReason();
        String rejectReason = reason == null || reason.trim().isEmpty()
                ? "Extension request rejected."
                : reason.trim();

        deadline.setIsExtensionPending(false);
        deadline.setPendingRequestedDate(null);
        deadline.setExtensionStatus(TaskDeadlineEntity.ExtensionStatus.REJECTED);
        deadline.setExtensionReviewedBy(reviewerId);
        deadline.setExtensionReviewedAt(Instant.now());
        deadline.setExtensionRejectReason(rejectReason);
        deadlineRepository.save(deadline);

        eventPublisher.publishEvent(
                new ExtensionRejectedEvent(
                        this,
                        taskId,
                        task.getProjectId(),
                        reviewerId,
                        resolveTargets(requesterId, task),
                        currentDueDate,
                        requestedDueDate,
                        requestReason,
                        rejectReason,
                        requesterId
                )
        );

        Map<String, Object> result = toResponse(deadline);
        result.put("status", autoRejected ? "AUTO_REJECTED" : "REJECTED");
        result.put("current_due_date", currentDueDate);
        result.put("requested_due_date", requestedDueDate);
        result.put("reject_reason", rejectReason);
        return result;
    }

    private String resolveTargetReviewerId(TaskEntity task, String requesterId) {
        if (validReviewer(task.getAuthorUserId(), requesterId)) {
            return task.getAuthorUserId();
        }

        ProjectEntity project = projectRepository.findByIdAndDeletedFalse(task.getProjectId()).orElse(null);

        if (project != null && validReviewer(project.getOwnerId(), requesterId)) {
            return project.getOwnerId();
        }

        if (project != null && project.getDepartmentId() != null) {
            DepartmentEntity department = departmentRepository.findByIdAndDeletedFalse(project.getDepartmentId()).orElse(null);
            if (department != null && validReviewer(department.getManagerId(), requesterId)) {
                return department.getManagerId();
            }
        }

        User requester = userRepository.findByIdAndDeletedFalse(requesterId).orElse(null);

        if (requester != null && requester.getTeamId() != null) {
            TeamEntity team = teamRepository.findByIdAndDeletedFalse(requester.getTeamId()).orElse(null);
            if (team != null && validReviewer(team.getLeadId(), requesterId)) {
                return team.getLeadId();
            }
        }

        for (ProjectMember member : projectMemberRepository.findActiveByProjectId(task.getProjectId())) {
            if (!validReviewer(member.getUserId(), requesterId) || member.getRoleIds() == null) continue;

            boolean canManageDeadline = member.getRoleIds().stream()
                    .anyMatch(roleId -> permissionEvaluatorService.hasPermission(roleId, "TASK_DEADLINE_CONFIG"));

            if (canManageDeadline) {
                return member.getUserId();
            }
        }

        throw new AppException(ErrorCode.BAD_REQUEST, "No task creator or board/project creator found for this extension request.");
    }

    private boolean validReviewer(String candidateId, String requesterId) {
        return candidateId != null
                && !candidateId.isBlank()
                && !same(candidateId, requesterId)
                && userRepository.existsByIdAndDeletedFalse(candidateId);
    }

    private List<String> resolveTargets(String requesterId, TaskEntity task) {
        LinkedHashSet<String> ids = new LinkedHashSet<>();

        if (requesterId != null && !requesterId.isBlank()) ids.add(requesterId);
        if (task.getAssigneesUserId() != null) ids.addAll(task.getAssigneesUserId());

        return new ArrayList<>(ids);
    }

    private boolean same(String a, String b) {
        return a != null && b != null && a.equals(b);
    }

    private Instant extensionExpiresAt(TaskDeadlineEntity deadline) {
        return deadline.getExtensionRequestedAt() == null
                ? null
                : deadline.getExtensionRequestedAt().plus(EXTENSION_REVIEW_TIMEOUT);
    }

    private Map<String, Object> toResponse(TaskDeadlineEntity deadline) {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("id", deadline.getId());
        result.put("task_id", deadline.getTaskId());
        result.put("start_date", deadline.getStartDate());
        result.put("due_date", deadline.getDueDate());
        result.put("actual_completed_at", deadline.getActualCompletedAt());
        result.put("reminder_offset", deadline.getReminderOffset());
        result.put("status", deadline.getStatus() == null ? null : deadline.getStatus().name());
        result.put("extension_count", deadline.getExtensionCount());
        result.put("extension_limit", deadline.getExtensionLimit());
        result.put("is_reminder_sent", deadline.getIsReminderSent());
        result.put("is_extension_pending", deadline.getIsExtensionPending());
        result.put("pending_requested_date", deadline.getPendingRequestedDate());
        result.put("extension_status", deadline.getExtensionStatus() == null ? null : deadline.getExtensionStatus().name());
        result.put("extension_requested_by", deadline.getExtensionRequestedBy());
        result.put("extension_requested_at", deadline.getExtensionRequestedAt());
        result.put("extension_expires_at", extensionExpiresAt(deadline));
        result.put("extension_reason", deadline.getExtensionReason());
        result.put("extension_reviewed_by", deadline.getExtensionReviewedBy());
        result.put("extension_reviewed_at", deadline.getExtensionReviewedAt());
        result.put("extension_reject_reason", deadline.getExtensionRejectReason());

        return result;
    }
}
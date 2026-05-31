package com.fluxboard.activity.service;

import com.fluxboard.activity.dto.request.ActivityFilterRequest;
import com.fluxboard.activity.dto.response.ActivityActorResponse;
import com.fluxboard.activity.dto.response.ActivityResponse;
import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.repository.ActivityRepository;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.projectmember.entity.ProjectMember;
import com.fluxboard.project.projectmember.repository.ProjectMemberRepository;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.repository.RoleRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityService {
    private final ActivityRepository activityRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProjectMemberRepository projectMemberRepository;

    // ==========================================
    // 🛡️ LÕI PHÂN QUYỀN (SECURITY GUARDS)
    // ==========================================

    public void assertSystemAdmin(AuthenticatedUser currentUser) {
        if (!isSystemAdminSafe(currentUser)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Only SYSTEM_ADMIN can access global activity management.");
        }
    }

    private boolean isSystemAdminSafe(AuthenticatedUser currentUser) {
        if (currentUser == null || currentUser.roleId() == null) return false;
        try {
            RoleEntity role = roleRepository.findById(currentUser.roleId()).orElse(null);
            return role != null && role.getName() == Role.SYSTEM_ADMIN;
        } catch (Exception e) {
            return false;
        }
    }

    public void assertProjectViewAccess(String projectId, AuthenticatedUser currentUser) {
        checkProjectAccess(projectId, currentUser, false);
    }

    public void assertProjectManageAccess(String projectId, AuthenticatedUser currentUser) {
        checkProjectAccess(projectId, currentUser, true);
    }

    private void checkProjectAccess(String projectId, AuthenticatedUser currentUser, boolean requireManagePermission) {
        if (currentUser == null) throw new AppException(ErrorCode.UNAUTHORIZED, "Unauthorized.");

        if (isSystemAdminSafe(currentUser)) return;

        if (TextUtils.trimToNull(projectId) == null) {
            throw new AppException(ErrorCode.FORBIDDEN, "Cần cung cấp Project ID để kiểm tra quyền hạn dự án.");
        }

        List<ProjectMember> memberships = projectMemberRepository.findByUserIdAndDeletedFalse(currentUser.userId());
        ProjectMember member = memberships.stream()
                .filter(m -> projectId.equals(m.getProjectId()) && m.isActive())
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền truy cập vào dự án này."));

        if (requireManagePermission) {
            List<String> roles = member.getRoleIds();
            boolean canManage = roles != null && roles.stream().anyMatch(r -> 
                    r.toUpperCase().contains("LEADER") || 
                    r.toUpperCase().contains("MANAGER") || 
                    r.toUpperCase().contains("ADMIN"));
                    
            if (!canManage) {
                throw new AppException(ErrorCode.FORBIDDEN, "Chỉ Project Leader, Manager hoặc Admin mới có quyền thực hiện thao tác này.");
            }
        }
    }

    // ==========================================
    // 📊 XỬ LÝ LẤY DỮ LIỆU
    // ==========================================

    public ActivityResponse getById(String id, AuthenticatedUser currentUser) {
        ActivityEntity entity = findById(id);
        
        if (entity.getProjectId() != null) {
            assertProjectViewAccess(entity.getProjectId(), currentUser);
        } else {
            assertSystemAdmin(currentUser);
        }

        Map<String, ActivityActorResponse> users = resolveUserSummaries(List.of(entity));
        return toResponse(entity, users);
    }

    // 🚀 ĐÂY LÀ HÀM CỐT LÕI ĐÃ ĐƯỢC CHỈNH SỬA ĐỂ BƠM NGẦM FILTER
    public Page<ActivityResponse> getPage(ActivityFilterRequest filter, Pageable pageable, AuthenticatedUser currentUser) {
        ActivityFilterRequest normalized = normalizeFilter(filter);
        validateFilter(normalized);

        // 1. Sếp Tổng -> Thấy hết, đẩy thẳng filter xuống
        if (isSystemAdminSafe(currentUser)) {
            return toResponsePage(activityRepository.findByFilter(normalized, pageable));
        }

        // 2. Lọc trong 1 dự án cụ thể -> Check quyền dự án rồi đẩy filter xuống
        if (normalized.projectId() != null) {
            assertProjectViewAccess(normalized.projectId(), currentUser);
            return toResponsePage(activityRepository.findByFilter(normalized, pageable));
        }

        // 3. Bảng tin chung -> Lấy danh sách ID dự án đang tham gia
        List<String> myProjectIds = projectMemberRepository.findByUserIdAndDeletedFalse(currentUser.userId())
                .stream()
                .filter(ProjectMember::isActive)
                .map(ProjectMember::getProjectId)
                .distinct()
                .toList();

        if (myProjectIds.isEmpty()) {
            return Page.empty(pageable);
        }

        // 🚀 BƠM NGẦM DANH SÁCH DỰ ÁN VÀO BỘ LỌC ĐỂ DÙNG CHUNG HÀM findByFilter
        ActivityFilterRequest scopedFilter = new ActivityFilterRequest(
                normalized.activityType(),
                normalized.sourceTypes(),
                normalized.actions(),
                normalized.actorUserIds(),
                normalized.targetUserIds(),
                normalized.sourceId(),
                null, 
                myProjectIds, // 🚀 Danh sách ID dự án được tiêm vào đây!
                normalized.boardId(),
                normalized.taskId(),
                normalized.from(),
                normalized.to()
        );

        // Giờ hệ thống mới xài đến hàm lọc dưới Mongo!
        return toResponsePage(activityRepository.findByFilter(scopedFilter, pageable));
    }

    public Page<ActivityResponse> getPageByTask(String taskId, String projectId, Pageable pageable, AuthenticatedUser currentUser) {
        assertProjectViewAccess(projectId, currentUser);
        return toResponsePage(activityRepository.findByTaskIdAndDeletedFalse(TextUtils.trim(taskId), pageable));
    }

    public Page<ActivityResponse> getPageByProject(String projectId, Pageable pageable, AuthenticatedUser currentUser) {
        assertProjectViewAccess(projectId, currentUser);
        return toResponsePage(activityRepository.findByProjectIdAndDeletedFalse(TextUtils.trim(projectId), pageable));
    }

    public Page<ActivityResponse> getPageBySource(ActivitySource sourceType, String sourceId, String projectId, Pageable pageable, AuthenticatedUser currentUser) {
        if (projectId != null) {
            assertProjectViewAccess(projectId, currentUser);
        } else {
            assertSystemAdmin(currentUser);
        }
        return toResponsePage(activityRepository.findBySourceTypeAndSourceIdAndDeletedFalse(sourceType, TextUtils.trim(sourceId), pageable));
    }

    public List<ActivityResponse> getRecentActivities(String projectId, Pageable pageable, AuthenticatedUser currentUser) {
        assertProjectViewAccess(projectId, currentUser);
        
        List<ActivityEntity> activities = activityRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId, pageable);
        if (activities.isEmpty()) return List.of();
        Map<String, ActivityActorResponse> users = resolveUserSummaries(activities);
        return activities.stream().map(entity -> toResponse(entity, users)).toList();
    }

    // ==========================================
    // 📝 XỬ LÝ GHI LOG
    // ==========================================

    public ActivityEntity log(ActivitySource sourceType, String sourceId, String projectId, String boardId, String taskId,
                              String actorUserId, ActivityAction action, String field, String oldValue, String newValue, String message) {
        return log(ActivityEntity.ActivityType.ACTIVITY_LOG, sourceType, sourceId, projectId, boardId, taskId, actorUserId, null, action, field, oldValue, newValue, message, null, null, null);
    }

    public ActivityEntity log(ActivityEntity.ActivityType type, ActivitySource sourceType, String sourceId, String projectId, String boardId, String taskId,
                              String actorUserId, String targetUserId, ActivityAction action, String field, String oldValue, String newValue,
                              String message, String ipAddress, String deviceInfo, Map<String, Object> metadata) {
        if (sourceType == null) throw new AppException(ErrorCode.BAD_REQUEST, "Activity source type is required.");
        if (action == null) throw new AppException(ErrorCode.BAD_REQUEST, "Activity action is required.");

        ActivityEntity entity = new ActivityEntity();
        entity.setActivityType(type);
        entity.setSourceType(sourceType);
        entity.setSourceId(TextUtils.trimToNull(sourceId));
        entity.setProjectId(TextUtils.trimToNull(projectId));
        entity.setBoardId(TextUtils.trimToNull(boardId));
        entity.setTaskId(TextUtils.trimToNull(taskId));
        entity.setActorUserId(TextUtils.trimToNull(actorUserId));
        entity.setTargetUserId(TextUtils.trimToNull(targetUserId));
        entity.setAction(action);
        entity.setField(TextUtils.trimToNull(field));
        entity.setOldValue(TextUtils.trimToNull(oldValue));
        entity.setNewValue(TextUtils.trimToNull(newValue));
        entity.setMessage(TextUtils.trimToNull(message));
        entity.setIpAddress(TextUtils.trimToNull(ipAddress));
        entity.setDeviceInfo(TextUtils.trimToNull(deviceInfo));
        entity.setMetadata(metadata);
        return activityRepository.save(entity);
    }

    public void logTaskCreated(String taskId, String boardId, String projectId, String actorUserId, String taskTitle) {
        log(ActivitySource.TASK, taskId, projectId, boardId, taskId, actorUserId, ActivityAction.CREATE, null, null, null, buildMessage("Task created", taskTitle));
    }

    public void logTaskUpdated(String taskId, String boardId, String projectId, String actorUserId, String field, String oldValue, String newValue, String taskTitle) {
        log(ActivitySource.TASK, taskId, projectId, boardId, taskId, actorUserId, ActivityAction.UPDATE, field, oldValue, newValue, buildMessage("Task updated", taskTitle));
    }

    public void logTaskMoved(String taskId, String boardId, String projectId, String actorUserId, String oldColumnId, String newColumnId, String taskTitle) {
        log(ActivitySource.TASK, taskId, projectId, boardId, taskId, actorUserId, ActivityAction.MOVE, "columnId", oldColumnId, newColumnId, buildMessage("Task moved", taskTitle));
    }

    public void logTaskDeleted(String taskId, String boardId, String projectId, String actorUserId, String taskTitle) {
        log(ActivitySource.TASK, taskId, projectId, boardId, taskId, actorUserId, ActivityAction.DELETE, null, null, null, buildMessage("Task deleted", taskTitle));
    }

    public void logExtensionRequested(String taskId, String projectId, String actorUserId, String currentDueDate, String requestedDueDate, String reason) {
        String msg = TextUtils.trimToNull(reason) == null ? "Deadline extension requested" : "Deadline extension requested: " + reason;
        log(ActivitySource.TASK, taskId, projectId, null, taskId, actorUserId, ActivityAction.UPDATE, "due_date_request", currentDueDate, requestedDueDate, msg);
    }

    public void logExtensionApproved(String taskId, String projectId, String managerId, String oldDueDate, String newDueDate) {
        log(ActivitySource.TASK, taskId, projectId, null, taskId, managerId, ActivityAction.UPDATE, "due_date", oldDueDate, newDueDate, "Deadline extension approved");
    }

    public void logExtensionRejected(String taskId, String projectId, String managerId, String currentDueDate, String requestedDueDate, String managerReason) {
        String msg = TextUtils.trimToNull(managerReason) == null ? "Deadline extension rejected" : "Deadline extension rejected: " + managerReason;
        log(ActivitySource.TASK, taskId, projectId, null, taskId, managerId, ActivityAction.UPDATE, "due_date_reject", requestedDueDate, currentDueDate, msg);
    }

    public void logUserCreated(String userId, String actorUserId, String email, String fullName) {
        log(ActivityEntity.ActivityType.SECURITY_AUDIT, ActivitySource.USER, userId, null, null, null, actorUserId, userId, ActivityAction.ACCOUNT_CREATED, null, null, null, "Người dùng %s đã được tạo".formatted(display(fullName)), null, null, Map.of("email", display(email)));
    }

    public void logUserUpdated(String userId, String actorUserId, String field, String oldValue, String newValue) {
        log(ActivityEntity.ActivityType.ACCOUNT_MANAGEMENT, ActivitySource.USER, userId, null, null, null, actorUserId, userId, ActivityAction.ACCOUNT_UPDATED, field, oldValue, newValue, "User updated", null, null, null);
    }

    public void logUserDeleted(String userId, String actorUserId, String email) {
        log(ActivityEntity.ActivityType.ACCOUNT_MANAGEMENT, ActivitySource.USER, userId, null, null, null, actorUserId, userId, ActivityAction.ACCOUNT_DELETED, null, null, null, "User deleted: %s".formatted(display(email)), null, null, null);
    }

    public void logPasswordChanged(String userId, String ipAddress, String deviceInfo) {
        log(ActivityEntity.ActivityType.SECURITY_AUDIT, ActivitySource.AUTH, userId, null, null, null, userId, userId, ActivityAction.PASSWORD_CHANGED, "password", null, null, "Người dùng đã đổi mật khẩu", ipAddress, deviceInfo, null);
    }

    public void logProjectCreated(String projectId, String actorUserId, String projectName) {
        log(ActivitySource.PROJECT, projectId, projectId, null, null, actorUserId, ActivityAction.CREATE, null, null, null, buildMessage("Project created", projectName));
    }

    public void logProjectUpdated(String projectId, String actorUserId, String field, String oldValue, String newValue, String projectName) {
        log(ActivitySource.PROJECT, projectId, projectId, null, null, actorUserId, ActivityAction.UPDATE, field, oldValue, newValue, buildMessage("Project updated", projectName));
    }

    public void logProjectDeleted(String projectId, String actorUserId, String projectName) {
        log(ActivitySource.PROJECT, projectId, projectId, null, null, actorUserId, ActivityAction.DELETE, null, null, null, buildMessage("Project deleted", projectName));
    }

    public void logProjectMemberAdded(String projectId, String addedUserId, String actorUserId, List<String> roleIds) {
        String roles = normalizeRoleIds(roleIds);
        String msg = roles == null ? "Project member added: %s".formatted(display(addedUserId)) : "Project member added: %s (roles: %s)".formatted(display(addedUserId), roles);
        log(ActivitySource.PROJECT, projectId, projectId, null, null, actorUserId, ActivityAction.ADD_MEMBER, "memberId", null, addedUserId, msg);
    }

    public void logBoardCreated(String boardId, String projectId, String actorUserId, String boardName) {
        log(ActivitySource.BOARD, boardId, projectId, boardId, null, actorUserId, ActivityAction.CREATE, null, null, null, buildMessage("Board created", boardName));
    }

    public void logBoardUpdated(String boardId, String projectId, String actorUserId, String field, String oldValue, String newValue, String boardName) {
        log(ActivitySource.BOARD, boardId, projectId, boardId, null, actorUserId, ActivityAction.UPDATE, field, oldValue, newValue, buildMessage("Board updated", boardName));
    }

    public void logBoardDeleted(String boardId, String projectId, String actorUserId, String boardName) {
        log(ActivitySource.BOARD, boardId, projectId, boardId, null, actorUserId, ActivityAction.DELETE, null, null, null, buildMessage("Board deleted", boardName));
    }

    // ==========================================
    // ⚙️ HELPER METHODS
    // ==========================================

    private ActivityEntity findById(String activityId) {
        return activityRepository.findByIdAndDeletedFalse(TextUtils.trim(activityId))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Activity not found."));
    }

    // 🚀 ĐÃ CẬP NHẬT: Thêm tham số projectIds để đồng bộ với ActivityFilterRequest
    private ActivityFilterRequest normalizeFilter(ActivityFilterRequest filter) {
        if (filter == null) return new ActivityFilterRequest(null, null, null, null, null, null, null, null, null, null, null, null);

        return new ActivityFilterRequest(
                filter.activityType(),
                normalizeValues(filter.sourceTypes()),
                normalizeValues(filter.actions()),
                normalizeIds(filter.actorUserIds()),
                normalizeIds(filter.targetUserIds()),
                TextUtils.trimToNull(filter.sourceId()),
                TextUtils.trimToNull(filter.projectId()),
                normalizeValues(filter.projectIds()), // Giữ nguyên danh sách projectIds nếu có
                TextUtils.trimToNull(filter.boardId()),
                TextUtils.trimToNull(filter.taskId()),
                filter.from(),
                filter.to()
        );
    }

    private void validateFilter(ActivityFilterRequest filter) {
        if (filter.from() != null && filter.to() != null && filter.from().isAfter(filter.to())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "'from' must be less than or equal to 'to'.");
        }
    }

    private Page<ActivityResponse> toResponsePage(Page<ActivityEntity> entityPage) {
        List<ActivityEntity> entities = entityPage.getContent();
        Map<String, ActivityActorResponse> users = resolveUserSummaries(entities);
        List<ActivityResponse> responses = entities.stream().map(entity -> toResponse(entity, users)).toList();
        return new PageImpl<>(responses, entityPage.getPageable(), entityPage.getTotalElements());
    }

    private Map<String, ActivityActorResponse> resolveUserSummaries(List<ActivityEntity> entities) {
        if (entities == null || entities.isEmpty()) return Map.of();

        Set<String> ids = new LinkedHashSet<>();
        for (ActivityEntity e : entities) {
            String actorId = TextUtils.trimToNull(e.getActorUserId());
            String targetId = TextUtils.trimToNull(e.getTargetUserId());
            if (actorId != null) ids.add(actorId);
            if (targetId != null) ids.add(targetId);
        }
        if (ids.isEmpty()) return Map.of();

        List<User> users = userRepository.findByIdInAndDeletedFalse(new ArrayList<>(ids));
        Set<String> roleIds = users.stream().map(User::getRoleId).map(TextUtils::trimToNull).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, RoleEntity> roles = roleIds.isEmpty() ? Map.of() : roleRepository.findAllById(roleIds).stream().collect(Collectors.toMap(RoleEntity::getId, r -> r));

        return users.stream().collect(Collectors.toMap(
                User::getId,
                user -> {
                    RoleEntity role = user.getRoleId() == null ? null : roles.get(user.getRoleId());
                    String roleName = role == null || role.getName() == null ? null : role.getName().name();
                    return new ActivityActorResponse(user.getId(), user.getFullName(), user.getEmail(), user.getAvatarUrl(), user.getRoleId(), roleName, user.getStatus());
                }
        ));
    }

    private ActivityResponse toResponse(ActivityEntity entity, Map<String, ActivityActorResponse> users) {
        String actorUserId = TextUtils.trimToNull(entity.getActorUserId());
        ActivityActorResponse actor = actorUserId == null ? null : users.getOrDefault(actorUserId, fallbackActor(actorUserId));

        String targetUserId = TextUtils.trimToNull(entity.getTargetUserId());
        ActivityActorResponse target = targetUserId == null ? null : users.getOrDefault(targetUserId, fallbackActor(targetUserId));

        return new ActivityResponse(
                entity.getId(), entity.getActivityType(), entity.getSourceType(), entity.getSourceId(), entity.getProjectId(),
                entity.getBoardId(), entity.getTaskId(), actorUserId, actor,
                actor == null ? null : actor.roleId(), actor == null ? null : actor.roleName(),
                targetUserId, target, target == null ? null : target.roleId(), target == null ? null : target.roleName(),
                entity.getAction(), entity.getField(), entity.getOldValue(), entity.getNewValue(), entity.getMessage(),
                entity.getIpAddress(), entity.getDeviceInfo(), entity.getMetadata(), entity.getCreatedAt(), entity.getUpdatedAt()
        );
    }

    private ActivityActorResponse fallbackActor(String userId) {
        return new ActivityActorResponse(userId, "User(%s)".formatted(shortId(userId)), null, null, null, null, null);
    }

    private String buildMessage(String actionLabel, String targetName) {
        String normalized = TextUtils.trimToNull(targetName);
        return normalized == null ? actionLabel : "%s: %s".formatted(actionLabel, normalized);
    }

    private String normalizeRoleIds(List<String> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) return null;
        String joined = roleIds.stream().map(TextUtils::trimToNull).filter(Objects::nonNull).distinct().collect(Collectors.joining(", "));
        return joined.isEmpty() ? null : joined;
    }

    private String display(String value) {
        String normalized = TextUtils.trimToNull(value);
        return normalized == null ? "N/A" : normalized;
    }

    private String shortId(String value) {
        if (value == null || value.isBlank()) return "unknown";
        return value.length() <= 6 ? value : value.substring(0, 6);
    }

    private <T> List<T> normalizeValues(List<T> values) {
        if (values == null || values.isEmpty()) return null;
        List<T> normalized = values.stream().filter(Objects::nonNull).distinct().toList();
        return normalized.isEmpty() ? null : normalized;
    }

    private List<String> normalizeIds(List<String> ids) {
        if (ids == null || ids.isEmpty()) return null;
        List<String> normalized = ids.stream().map(TextUtils::trimToNull).filter(Objects::nonNull).distinct().toList();
        return normalized.isEmpty() ? null : normalized;
    }
}
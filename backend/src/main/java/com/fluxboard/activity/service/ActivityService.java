package com.fluxboard.activity.service;

import com.fluxboard.activity.dto.response.ActivityResponse;
import com.fluxboard.activity.dto.response.LoginHistoryResponse;
import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.repository.ActivityRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.fluxboard.activity.dto.response.ActivityActorResponse;
import com.fluxboard.activity.dto.response.ActivityResponse;
import com.fluxboard.activity.dto.request.ActivityFilterRequest;
import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.repository.ActivityRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final UserRepository userRepository; 
    private final UserRepository userRepository;

    public ActivityService(ActivityRepository activityRepository, UserRepository userRepository) {
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
    }

    public ActivityResponse getById(String id) {
        ActivityEntity entity = findById(id);
        Map<String, ActivityActorResponse> actors = resolveActorSummaries(List.of(entity));
        return toResponse(entity, actors);
    }

    public Page<ActivityResponse> getPage(Pageable pageable) {
        return getPage(null, pageable);
    }

    public Page<ActivityResponse> getPage(ActivityFilterRequest filter, Pageable pageable) {
        ActivityFilterRequest normalizedFilter = normalizeFilter(filter);
        validateFilter(normalizedFilter);
        return toResponsePage(activityRepository.findByFilter(normalizedFilter, pageable));
    }

    public Page<ActivityResponse> getPageByTask(String taskId, Pageable pageable) {
        String normalizedTaskId = TextUtils.trim(taskId);
        return toResponsePage(activityRepository.findByTaskIdAndDeletedFalse(normalizedTaskId, pageable));
    }

    public Page<ActivityResponse> getPageByProject(String projectId, Pageable pageable) {
        String normalizedProjectId = TextUtils.trim(projectId);
        return toResponsePage(activityRepository.findByProjectIdAndDeletedFalse(normalizedProjectId, pageable));
    }

    public Page<ActivityResponse> getPageBySource(ActivitySource sourceType, String sourceId, Pageable pageable) {
        String normalizedSourceId = TextUtils.trim(sourceId);
        return toResponsePage(activityRepository.findBySourceTypeAndSourceIdAndDeletedFalse(sourceType,
                normalizedSourceId, pageable));
    }

    public void logTaskCreated(String taskId, String boardId, String projectId, String actorUserId, String taskTitle) {
        log(
                ActivitySource.TASK,
                taskId,
                projectId,
                boardId,
                taskId,
                actorUserId,
                ActivityAction.CREATE,
                null,
                null,
                null,
                buildMessage("Task created", taskTitle));
    }

    public void logTaskUpdated(
            String taskId,
            String boardId,
            String projectId,
            String actorUserId,
            String field,
            String oldValue,
            String newValue,
            String taskTitle) {
        log(
                ActivitySource.TASK,
                taskId,
                projectId,
                boardId,
                taskId,
                actorUserId,
                ActivityAction.UPDATE,
                field,
                oldValue,
                newValue,
                buildMessage("Task updated", taskTitle));
    }

    public void logTaskMoved(
            String taskId,
            String boardId,
            String projectId,
            String actorUserId,
            String oldColumnId,
            String newColumnId,
            String taskTitle) {
        log(
                ActivitySource.TASK,
                taskId,
                projectId,
                boardId,
                taskId,
                actorUserId,
                ActivityAction.MOVE,
                "columnId",
                TextUtils.trimToNull(oldColumnId),
                TextUtils.trimToNull(newColumnId),
                buildMessage("Task moved", taskTitle));
    }

    public void logTaskDeleted(String taskId, String boardId, String projectId, String actorUserId, String taskTitle) {
        log(
                ActivitySource.TASK,
                taskId,
                projectId,
                boardId,
                taskId,
                actorUserId,
                ActivityAction.DELETE,
                null,
                null,
                null,
                buildMessage("Task deleted", taskTitle));
    }

    public void logUserCreated(String userId, String actorUserId, String email, String fullName) {
        log(
                ActivitySource.USER,
                userId,
                null,
                null,
                null,
                actorUserId,
                ActivityAction.CREATE,
                null,
                null,
                null,
                "User created: %s (%s)".formatted(display(fullName), display(email)));
    }

    public void logUserUpdated(String userId, String actorUserId, String field, String oldValue, String newValue) {
        log(
                ActivitySource.USER,
                userId,
                null,
                null,
                null,
                actorUserId,
                ActivityAction.UPDATE,
                TextUtils.trimToNull(field),
                TextUtils.trimToNull(oldValue),
                TextUtils.trimToNull(newValue),
                "User updated");
    }

    public void logUserDeleted(String userId, String actorUserId, String email) {
        log(
                ActivitySource.USER,
                userId,
                null,
                null,
                null,
                actorUserId,
                ActivityAction.DELETE,
                null,
                null,
                null,
                "User deleted: %s".formatted(display(email)));
    }

    public void logProjectCreated(String projectId, String actorUserId, String projectName) {
        log(
                ActivitySource.PROJECT,
                projectId,
                projectId,
                null,
                null,
                actorUserId,
                ActivityAction.CREATE,
                null,
                null,
                null,
                buildMessage("Project created", projectName));
    }

    public void logProjectUpdated(
            String projectId,
            String actorUserId,
            String field,
            String oldValue,
            String newValue,
            String projectName) {
        log(
                ActivitySource.PROJECT,
                projectId,
                projectId,
                null,
                null,
                actorUserId,
                ActivityAction.UPDATE,
                TextUtils.trimToNull(field),
                TextUtils.trimToNull(oldValue),
                TextUtils.trimToNull(newValue),
                buildMessage("Project updated", projectName));
    }

    public void logProjectDeleted(String projectId, String actorUserId, String projectName) {
        log(
                ActivitySource.PROJECT,
                projectId,
                projectId,
                null,
                null,
                actorUserId,
                ActivityAction.DELETE,
                null,
                null,
                null,
                buildMessage("Project deleted", projectName));
    }

    public void logProjectMemberAdded(String projectId, String addedUserId, String actorUserId, List<String> roleIds) {
        String normalizedAddedUserId = TextUtils.trimToNull(addedUserId);
        String normalizedRoles = normalizeRoleIds(roleIds);
        String message = normalizedRoles == null
                ? "Project member added: %s".formatted(display(normalizedAddedUserId))
                : "Project member added: %s (roles: %s)".formatted(display(normalizedAddedUserId), normalizedRoles);

        log(
                ActivitySource.PROJECT,
                projectId,
                projectId,
                null,
                null,
                actorUserId,
                ActivityAction.ADD_MEMBER,
                "memberId",
                null,
                normalizedAddedUserId,
                message);
    }

    public void logBoardCreated(String boardId, String projectId, String actorUserId, String boardName) {
        log(
                ActivitySource.BOARD,
                boardId,
                projectId,
                boardId,
                null,
                actorUserId,
                ActivityAction.CREATE,
                null,
                null,
                null,
                buildMessage("Board created", boardName));
    }

    public void logBoardUpdated(
            String boardId,
            String projectId,
            String actorUserId,
            String field,
            String oldValue,
            String newValue,
            String boardName) {
        log(
                ActivitySource.BOARD,
                boardId,
                projectId,
                boardId,
                null,
                actorUserId,
                ActivityAction.UPDATE,
                TextUtils.trimToNull(field),
                TextUtils.trimToNull(oldValue),
                TextUtils.trimToNull(newValue),
                buildMessage("Board updated", boardName));
    }

    public void logBoardDeleted(String boardId, String projectId, String actorUserId, String boardName) {
        log(
                ActivitySource.BOARD,
                boardId,
                projectId,
                boardId,
                null,
                actorUserId,
                ActivityAction.DELETE,
                null,
                null,
                null,
                buildMessage("Board deleted", boardName));
    }

    public ActivityEntity log(
            ActivitySource sourceType,
            String sourceId,
            String projectId,
            String boardId,
            String taskId,
            String actorUserId,
            ActivityAction action,
            String field,
            String oldValue,
            String newValue,
            String message) {
        if (sourceType == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Activity source type is required.");
        }
        if (action == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Activity action is required.");
        }

        ActivityEntity entity = new ActivityEntity();
        entity.setSourceType(sourceType);
        entity.setSourceId(TextUtils.trimToNull(sourceId));
        entity.setProjectId(TextUtils.trimToNull(projectId));
        entity.setBoardId(TextUtils.trimToNull(boardId));
        entity.setTaskId(TextUtils.trimToNull(taskId));
        entity.setActorUserId(TextUtils.trimToNull(actorUserId));
        entity.setAction(action);
        entity.setField(TextUtils.trimToNull(field));
        entity.setOldValue(TextUtils.trimToNull(oldValue));
        entity.setNewValue(TextUtils.trimToNull(newValue));
        entity.setMessage(TextUtils.trimToNull(message));

        return activityRepository.save(entity);
    }

    private ActivityEntity findById(String activityId) {
        return activityRepository.findByIdAndDeletedFalse(TextUtils.trim(activityId))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Activity not found."));
    }

    private ActivityFilterRequest normalizeFilter(ActivityFilterRequest filter) {
        if (filter == null) {
            return new ActivityFilterRequest(null, null, null, null, null, null, null, null, null);
        }

        return new ActivityFilterRequest(
                normalizeValues(filter.sourceTypes()),
                normalizeValues(filter.actions()),
                normalizeIds(filter.actorUserIds()),
                TextUtils.trimToNull(filter.sourceId()),
                TextUtils.trimToNull(filter.projectId()),
                TextUtils.trimToNull(filter.boardId()),
                TextUtils.trimToNull(filter.taskId()),
                filter.from(),
                filter.to());
    }

    private void validateFilter(ActivityFilterRequest filter) {
        Instant from = filter.from();
        Instant to = filter.to();

        if (from != null && to != null && from.isAfter(to)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "'from' must be less than or equal to 'to'.");
        }
    }

    private Page<ActivityResponse> toResponsePage(Page<ActivityEntity> entityPage) {
        List<ActivityEntity> entities = entityPage.getContent();
        Map<String, ActivityActorResponse> actors = resolveActorSummaries(entities);

        List<ActivityResponse> responses = entities.stream()
                .map(entity -> toResponse(entity, actors))
                .toList();

        return new PageImpl<>(responses, entityPage.getPageable(), entityPage.getTotalElements());
    }

    private Map<String, ActivityActorResponse> resolveActorSummaries(List<ActivityEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Map.of();
        }

        Set<String> actorUserIds = new LinkedHashSet<>();
        for (ActivityEntity entity : entities) {
            String actorUserId = TextUtils.trimToNull(entity.getActorUserId());
            if (actorUserId != null) {
                actorUserIds.add(actorUserId);
            }
        }

        if (actorUserIds.isEmpty()) {
            return Map.of();
        }

        List<User> users = userRepository.findByIdInAndDeletedFalse(new ArrayList<>(actorUserIds));
        Map<String, ActivityActorResponse> result = new HashMap<>();

        for (User user : users) {
            result.put(
                    user.getId(),
                    new ActivityActorResponse(user.getId(), user.getFullName(), user.getAvatarUrl()));
        }

        return result;
    }

    private ActivityResponse toResponse(ActivityEntity entity, Map<String, ActivityActorResponse> actors) {
        String actorUserId = TextUtils.trimToNull(entity.getActorUserId());
        ActivityActorResponse actor = actorUserId == null
                ? null
                : actors.getOrDefault(
                        actorUserId,
                        new ActivityActorResponse(actorUserId, "User(%s)".formatted(shortId(actorUserId)), null));

        return new ActivityResponse(
                entity.getId(),
                entity.getSourceType(),
                entity.getSourceId(),
                entity.getProjectId(),
                entity.getBoardId(),
                entity.getTaskId(),
                actorUserId,
                actor,
                entity.getAction(),
                entity.getField(),
                entity.getOldValue(),
                entity.getNewValue(),
                entity.getMessage(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    private String buildMessage(String actionLabel, String targetName) {
        String normalizedTargetName = TextUtils.trimToNull(targetName);
        if (normalizedTargetName == null) {
            return actionLabel;
        }
        return "%s: %s".formatted(actionLabel, normalizedTargetName);
    }

    private String normalizeRoleIds(List<String> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) {
            return null;
        }

        List<String> normalized = roleIds.stream()
                .map(TextUtils::trimToNull)
                .filter(value -> value != null)
                .distinct()
                .toList();

        if (normalized.isEmpty()) {
            return null;
        }

        return String.join(", ", normalized);
    }

    private String display(String value) {
        String normalized = TextUtils.trimToNull(value);
        return normalized == null ? "N/A" : normalized;
    }

    private String shortId(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.length() <= 6 ? value : value.substring(0, 6);
    }

    private <T> List<T> normalizeValues(List<T> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }

        List<T> normalized = values.stream()
                .filter(value -> value != null)
                .distinct()
                .toList();

        return normalized.isEmpty() ? null : normalized;
    }

    private List<String> normalizeIds(List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return null;
        }

        List<String> normalized = ids.stream()
                .map(TextUtils::trimToNull)
                .filter(value -> value != null)
                .distinct()
                .toList();

        return normalized.isEmpty() ? null : normalized;
    }

    public List<ActivityResponse> getRecentActivities(String projectId, Pageable pageable) {
        // Lấy danh sách activity thô từ DB
        List<ActivityEntity> activities = activityRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId, pageable);

        if (activities.isEmpty()) {
            return List.of();
        }

        Set<String> userIds = activities.stream()
                .map(ActivityEntity::getUserId)
                .collect(Collectors.toSet());

        List<User> users = userRepository.findByIdInAndDeletedFalse(new ArrayList<>(userIds));
        Map<String, User> userMap = users.stream().collect(Collectors.toMap(User::getId, u -> u));

        // Ráp Tên và Avatar vào Activity
        return activities.stream().map(activity -> {
            User user = userMap.get(activity.getUserId());
            return ActivityResponse.builder()
                    .id(activity.getId())
                    .projectId(activity.getProjectId())
                    .userId(activity.getUserId())
                    .userName(user != null ? user.getFullName() : "Unknown User")
                    .userAvatar(user != null ? user.getAvatarUrl() : null)
                    .action(activity.getAction())
                    .createdAt(activity.getCreatedAt())
                    .build();
        }).toList();
    }
}
}

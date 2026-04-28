package com.fluxboard.project.projectmember.service;

import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.board.task.dto.response.TaskUserSummaryResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.projectmember.dto.request.UpdateProjectMemberRequest;
import com.fluxboard.project.projectmember.dto.response.ProjectMemberResponse;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.projectmember.entity.ProjectMember;
import com.fluxboard.project.projectmember.repository.ProjectMemberRepository;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import com.fluxboard.activity.event.ActivityCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectMemberService {

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public ProjectMemberService(
            ProjectMemberRepository projectMemberRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.projectMemberRepository = projectMemberRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    public List<ProjectMemberResponse> getMembers(String projectId) {
        String normalizedProjectId = TextUtils.trim(projectId);
        validateProjectExists(normalizedProjectId);

        List<ProjectMember> members = projectMemberRepository.findByProjectIdAndDeletedFalse(normalizedProjectId);
        Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(members);

        return members.stream()
                .map(member -> toResponse(member, users))
                .toList();
    }

    public ProjectMemberResponse getMemberById(String projectId, String memberId) {
        ProjectMember member = findMember(projectId, memberId);
        Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(List.of(member));
        return toResponse(member, users);
    }

    @Transactional
    public ProjectMemberResponse updateMember(
            String projectId,
            String memberId,
            UpdateProjectMemberRequest request,
            String actorUserId
    ) {
        if (request.roleIds() == null && request.active() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "At least one field is required to update member.");
        }

        ProjectMember member = findMember(projectId, memberId);
        String previousRoles = normalizeRoleIds(member.getRoleIds());
        boolean previousActive = member.isActive();

        if (request.roleIds() != null) {
            member.setRoleIds(resolveRoleIds(request.roleIds()));
        }
        if (request.active() != null) {
            member.setActive(request.active());
        }

        ProjectMember saved = projectMemberRepository.save(member);
        logMemberUpdated(saved, TextUtils.trimToNull(actorUserId), previousRoles, previousActive);

        Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(List.of(saved));
        return toResponse(saved, users);
    }

    @Transactional
    public void removeMember(String projectId, String memberId, String actorUserId) {
        ProjectMember member = findMember(projectId, memberId);

        ProjectEntity project = projectRepository.findByIdAndDeletedFalse(member.getProjectId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));
        if (member.getUserId() != null && member.getUserId().equals(project.getOwnerId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Project owner cannot be removed from members.");
        }

        member.setActive(false);
        member.markDeleted();
        projectMemberRepository.save(member);

        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.PROJECT, member.getProjectId(), member.getProjectId(), null, null,
                TextUtils.trimToNull(actorUserId), ActivityAction.DELETE, "memberId", TextUtils.trimToNull(member.getUserId()), null,
                "Project member removed: %s".formatted(display(member.getUserId()))
        ));
    }

    private ProjectMember findMember(String projectId, String memberId) {
        String normalizedProjectId = TextUtils.trim(projectId);
        String normalizedMemberId = TextUtils.trim(memberId);
        validateProjectExists(normalizedProjectId);

        ProjectMember member = projectMemberRepository.findByIdAndDeletedFalse(normalizedMemberId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project member not found."));

        if (!normalizedProjectId.equals(member.getProjectId())) {
            throw new AppException(ErrorCode.NOT_FOUND, "Project member not found.");
        }

        return member;
    }

    private void validateProjectExists(String projectId) {
        if (!projectRepository.existsByIdAndDeletedFalse(projectId)) {
            throw new AppException(ErrorCode.NOT_FOUND, "Project not found.");
        }
    }

    private Map<String, TaskUserSummaryResponse> resolveUserSummaries(List<ProjectMember> members) {
        if (members == null || members.isEmpty()) {
            return Map.of();
        }

        Set<String> userIds = new LinkedHashSet<>();
        for (ProjectMember member : members) {
            String userId = TextUtils.trimToNull(member.getUserId());
            if (userId != null) {
                userIds.add(userId);
            }
        }

        if (userIds.isEmpty()) {
            return Map.of();
        }

        List<User> users = userRepository.findByIdInAndDeletedFalse(new ArrayList<>(userIds));
        Map<String, TaskUserSummaryResponse> result = new HashMap<>();
        for (User user : users) {
            result.put(user.getId(), new TaskUserSummaryResponse(user.getId(), user.getFullName(), user.getAvatarUrl()));
        }
        return result;
    }

    private ProjectMemberResponse toResponse(ProjectMember member, Map<String, TaskUserSummaryResponse> users) {
        String userId = TextUtils.trimToNull(member.getUserId());
        TaskUserSummaryResponse user = userId == null
                ? null
                : users.getOrDefault(userId, new TaskUserSummaryResponse(userId, "User(" + shortId(userId) + ")", null));

        return new ProjectMemberResponse(
                member.getId(),
                member.getProjectId(),
                userId,
                user,
                member.getRoleIds() == null ? List.of() : member.getRoleIds(),
                member.isActive(),
                member.getCreatedAt(),
                member.getUpdatedAt()
        );
    }

    private void logMemberUpdated(ProjectMember member, String actorUserId, String previousRoles, boolean previousActive) {
        String currentRoles = normalizeRoleIds(member.getRoleIds());
        boolean currentActive = member.isActive();

        String oldValue;
        String newValue;
        if (previousActive != currentActive) {
            oldValue = String.valueOf(previousActive);
            newValue = String.valueOf(currentActive);
        } else {
            oldValue = previousRoles;
            newValue = currentRoles;
        }

        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.PROJECT, member.getProjectId(), member.getProjectId(), null, null,
                actorUserId, ActivityAction.UPDATE, "memberId", oldValue, newValue,
                "Project member updated: %s".formatted(display(member.getUserId()))
        ));
    }

    private List<String> resolveRoleIds(List<String> roleIds) {
        List<String> normalized = normalizeRoleList(roleIds);
        if (normalized.isEmpty()) {
            return List.of("MEMBER");
        }
        return normalized;
    }

    private List<String> normalizeRoleList(List<String> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) {
            return List.of();
        }

        return roleIds.stream()
                .map(TextUtils::trimToNull)
                .filter(value -> value != null)
                .distinct()
                .toList();
    }

    private String normalizeRoleIds(List<String> roleIds) {
        List<String> normalized = normalizeRoleList(roleIds);
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
}

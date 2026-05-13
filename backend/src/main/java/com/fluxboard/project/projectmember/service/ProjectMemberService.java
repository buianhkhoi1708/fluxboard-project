package com.fluxboard.project.projectmember.service;

import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.event.ActivityCreatedEvent;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.projectmember.dto.request.AddProjectMemberRequest;
import com.fluxboard.project.projectmember.dto.request.UpdateProjectMemberRequest;
import com.fluxboard.project.projectmember.dto.response.ProjectMemberResponse;
import com.fluxboard.project.projectmember.entity.ProjectMember;
import com.fluxboard.project.projectmember.repository.ProjectMemberRepository;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

        List<ProjectMember> members =
                projectMemberRepository.findByProjectIdAndDeletedFalse(normalizedProjectId);

        Map<String, User> users =
                resolveUserSummaries(members);

        return members.stream()
                .map(member -> toResponse(member, users))
                .toList();
    }

    public ProjectMemberResponse getMemberById(
            String projectId,
            String userId
    ) {
        ProjectMember member =
                findMember(projectId, userId);

        Map<String, User> users =
                resolveUserSummaries(List.of(member));

        return toResponse(member, users);
    }

    @Transactional
    public ProjectMemberResponse addMember(
            String projectId,
            AddProjectMemberRequest request,
            String actorUserId
    ) {
        String normalizedProjectId =
                TextUtils.trim(projectId);

        String normalizedUserId =
                TextUtils.trim(request.userId());

        validateProjectExists(normalizedProjectId);

        if (!userRepository.existsByIdAndDeletedFalse(normalizedUserId)) {
            throw new AppException(
                    ErrorCode.BAD_REQUEST,
                    "User ID to add does not exist."
            );
        }

        if (projectMemberRepository.existsByProjectIdAndUserIdAndDeletedFalse(
                normalizedProjectId,
                normalizedUserId
        )) {

            ProjectMember existing =
                    findMember(normalizedProjectId, normalizedUserId);

            return toResponse(
                    existing,
                    resolveUserSummaries(List.of(existing))
            );
        }

        ProjectMember newMember = new ProjectMember();

        newMember.setProjectId(normalizedProjectId);
        newMember.setUserId(normalizedUserId);

        List<String> roles =
                (request.roleIds() != null && !request.roleIds().isEmpty())
                        ? request.roleIds()
                        : List.of("MEMBER");

        newMember.setRoleIds(roles);
        newMember.setActive(true);

        ProjectMember saved =
                projectMemberRepository.save(newMember);

        String normalizedRoles =
                normalizeRoleIds(roles);

        String msg =
                "Project member added: "
                        + normalizedUserId
                        + (normalizedRoles != null
                        ? " (roles: " + normalizedRoles + ")"
                        : "");

        eventPublisher.publishEvent(
                new ActivityCreatedEvent(
                        this,
                        ActivitySource.PROJECT,
                        normalizedProjectId,
                        normalizedProjectId,
                        null,
                        null,
                        TextUtils.trimToNull(actorUserId),
                        ActivityAction.ADD_MEMBER,
                        "memberId",
                        null,
                        normalizedUserId,
                        msg
                )
        );

        Map<String, User> users =
                resolveUserSummaries(List.of(saved));

        return toResponse(saved, users);
    }

    @Transactional
    public ProjectMemberResponse updateMember(
            String projectId,
            String userId,
            UpdateProjectMemberRequest request,
            String actorUserId
    ) {

        if (request.roleIds() == null && request.active() == null) {
            throw new AppException(
                    ErrorCode.BAD_REQUEST,
                    "At least one field is required to update member."
            );
        }

        ProjectMember member =
                findMember(projectId, userId);

        String previousRoles =
                normalizeRoleIds(member.getRoleIds());

        boolean previousActive =
                member.isActive();

        if (request.roleIds() != null) {

            List<String> newRoles =
                    resolveRoleIds(request.roleIds());

            if (
                    member.getRoleIds() != null
                            && member.getRoleIds().contains("role_project_admin")
                            && !newRoles.contains("role_project_admin")
            ) {

                int adminCount =
                        projectMemberRepository.countActiveAdmins(
                                member.getProjectId(),
                                "role_project_admin"
                        );

                if (adminCount <= 1) {
                    throw new AppException(
                            ErrorCode.BAD_REQUEST,
                            "Cannot remove the last admin of the project."
                    );
                }
            }

            member.setRoleIds(newRoles);
        }

        if (request.active() != null) {

            if (
                    member.getRoleIds() != null
                            && member.getRoleIds().contains("role_project_admin")
                            && Boolean.FALSE.equals(request.active())
            ) {

                int adminCount =
                        projectMemberRepository.countActiveAdmins(
                                member.getProjectId(),
                                "role_project_admin"
                        );

                if (adminCount <= 1) {
                    throw new AppException(
                            ErrorCode.BAD_REQUEST,
                            "Cannot suspend the last admin of the project."
                    );
                }
            }

            member.setActive(request.active());
        }

        ProjectMember saved =
                projectMemberRepository.save(member);

        logMemberUpdated(
                saved,
                TextUtils.trimToNull(actorUserId),
                previousRoles,
                previousActive
        );

        Map<String, User> users =
                resolveUserSummaries(List.of(saved));

        return toResponse(saved, users);
    }

    @Transactional
    public void removeMember(
            String projectId,
            String userId,
            String actorUserId
    ) {

        ProjectMember member =
                findMember(projectId, userId);

        ProjectEntity project =
                projectRepository.findByIdAndDeletedFalse(member.getProjectId())
                        .orElseThrow(() ->
                                new AppException(
                                        ErrorCode.NOT_FOUND,
                                        "Project not found."
                                )
                        );

        if (
                member.getUserId() != null
                        && member.getUserId().equals(project.getOwnerId())
        ) {
            throw new AppException(
                    ErrorCode.BAD_REQUEST,
                    "Project owner cannot be removed from members."
            );
        }

        if (
                member.getRoleIds() != null
                        && member.getRoleIds().contains("role_project_admin")
        ) {

            int adminCount =
                    projectMemberRepository.countActiveAdmins(
                            member.getProjectId(),
                            "role_project_admin"
                    );

            if (adminCount <= 1) {
                throw new AppException(
                        ErrorCode.BAD_REQUEST,
                        "Cannot remove the last admin of the project."
                );
            }
        }

        member.setActive(false);
        member.markDeleted();

        projectMemberRepository.save(member);

        eventPublisher.publishEvent(
                new ActivityCreatedEvent(
                        this,
                        ActivitySource.PROJECT,
                        member.getProjectId(),
                        member.getProjectId(),
                        null,
                        null,
                        TextUtils.trimToNull(actorUserId),
                        ActivityAction.DELETE,
                        "memberId",
                        TextUtils.trimToNull(member.getUserId()),
                        null,
                        "Project member removed: %s"
                                .formatted(display(member.getUserId()))
                )
        );
    }

    private ProjectMember findMember(
            String projectId,
            String userId
    ) {

        String normalizedProjectId =
                TextUtils.trim(projectId);

        String normalizedUserId =
                TextUtils.trim(userId);

        validateProjectExists(normalizedProjectId);

        return projectMemberRepository
                .findByProjectIdAndUserIdAndDeletedFalse(
                        normalizedProjectId,
                        normalizedUserId
                )
                .orElseThrow(() ->
                        new AppException(
                                ErrorCode.NOT_FOUND,
                                "Project member not found."
                        )
                );
    }

    private void validateProjectExists(String projectId) {

        if (!projectRepository.existsByIdAndDeletedFalse(projectId)) {
            throw new AppException(
                    ErrorCode.NOT_FOUND,
                    "Project not found."
            );
        }
    }

    private Map<String, User> resolveUserSummaries(
            List<ProjectMember> members
    ) {

        if (members == null || members.isEmpty()) {
            return Map.of();
        }

        Set<String> userIds = new LinkedHashSet<>();

        for (ProjectMember member : members) {

            String userId =
                    TextUtils.trimToNull(member.getUserId());

            if (userId != null) {
                userIds.add(userId);
            }
        }

        if (userIds.isEmpty()) {
            return Map.of();
        }

        List<User> users =
                userRepository.findByIdInAndDeletedFalse(
                        new ArrayList<>(userIds)
                );

        Map<String, User> result = new HashMap<>();

        for (User user : users) {
            result.put(user.getId(), user);
        }

        return result;
    }

    private ProjectMemberResponse toResponse(
            ProjectMember member,
            Map<String, User> users
    ) {

        String userId =
                TextUtils.trimToNull(member.getUserId());

        User user =
                userId == null ? null : users.get(userId);

        return new ProjectMemberResponse(
                member.getId(),
                userId,
                user != null ? user.getFullName() : "Unknown User",
                user != null ? user.getEmail() : null,
                user != null ? user.getAvatarUrl() : null,
                member.isActive(),
                member.getRoleIds() == null
                        ? List.of()
                        : member.getRoleIds(),
                member.getCreatedAt()
        );
    }

    private void logMemberUpdated(
            ProjectMember member,
            String actorUserId,
            String previousRoles,
            boolean previousActive
    ) {

        String currentRoles =
                normalizeRoleIds(member.getRoleIds());

        boolean currentActive =
                member.isActive();

        String oldValue;
        String newValue;

        if (previousActive != currentActive) {
            oldValue = String.valueOf(previousActive);
            newValue = String.valueOf(currentActive);
        } else {
            oldValue = previousRoles;
            newValue = currentRoles;
        }

        eventPublisher.publishEvent(
                new ActivityCreatedEvent(
                        this,
                        ActivitySource.PROJECT,
                        member.getProjectId(),
                        member.getProjectId(),
                        null,
                        null,
                        actorUserId,
                        ActivityAction.UPDATE,
                        "memberId",
                        oldValue,
                        newValue,
                        "Project member updated: %s"
                                .formatted(display(member.getUserId()))
                )
        );
    }

    private List<String> resolveRoleIds(List<String> roleIds) {

        List<String> normalized =
                normalizeRoleList(roleIds);

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

        List<String> normalized =
                normalizeRoleList(roleIds);

        if (normalized.isEmpty()) {
            return null;
        }

        return String.join(", ", normalized);
    }

    private String display(String value) {

        String normalized =
                TextUtils.trimToNull(value);

        return normalized == null
                ? "N/A"
                : normalized;
    }

    private String shortId(String value) {

        if (value == null || value.isBlank()) {
            return "unknown";
        }

        return value.length() <= 6
                ? value
                : value.substring(0, 6);
    }
}
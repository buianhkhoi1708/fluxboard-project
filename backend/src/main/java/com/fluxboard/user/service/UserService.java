package com.fluxboard.user.service;

import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.event.ActivityCreatedEvent;
import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.projectmember.entity.ProjectMember;
import com.fluxboard.project.projectmember.repository.ProjectMemberRepository;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.repository.RoleRepository;
import com.fluxboard.user.dto.request.CreateUserRequest;
import com.fluxboard.user.dto.request.UpdateUserRequest;
import com.fluxboard.user.dto.response.UnassignedUserResponse;
import com.fluxboard.user.dto.response.UserResponse;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserService implements CrudService<UserResponse, String, CreateUserRequest, UpdateUserRequest> {
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final BCryptPasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final UserPresenceService presenceService;
    private final ActivityService activityService;

    public UserService(UserRepository userRepository, ProjectMemberRepository projectMemberRepository,
                       ApplicationEventPublisher eventPublisher, RoleRepository roleRepository,
                       UserPresenceService presenceService, ActivityService activityService) {
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.eventPublisher = eventPublisher;
        this.roleRepository = roleRepository;
        this.presenceService = presenceService;
        this.activityService = activityService;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @Override
    public UserResponse create(CreateUserRequest request) {
        return create(request, null);
    }

    public UserResponse create(CreateUserRequest request, String actorUserId) {
        String email = TextUtils.trim(request.email());
        if (userRepository.existsByEmailAndDeletedFalse(email)) throw new AppException(ErrorCode.CONFLICT, "Email already exists.");

        User user = new User();
        user.setEmail(email);
        user.setPassword(encodePassword(request.password()));
        user.setFullName(TextUtils.trim(request.fullName()));
        user.setAvatarUrl(resolveAvatarUrl(request.avatarUrl()));
        user.setRoleId(TextUtils.trimToNull(request.roleId()));
        user.setTeamId(TextUtils.trimToNull(request.teamId()));

        User saved = userRepository.save(user);

        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.USER, saved.getId(), null, null, null,
                TextUtils.trimToNull(actorUserId), ActivityAction.CREATE, null, null, null,
                "User created: " + saved.getFullName() + " (" + saved.getEmail() + ")"
        ));
        activityService.logUserCreated(saved.getId(), actorUserId, saved.getEmail(), saved.getFullName());
        return toResponse(saved);
    }

    @Override
    public UserResponse getById(String id) {
        return toResponse(findUserById(id));
    }

    @Override
    public Page<UserResponse> getPage(Pageable pageable) {
        return userRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    public Page<UserResponse> getAccountManagementPage(Pageable pageable, AuthenticatedUser currentUser) {
        assertSystemAdmin(currentUser);
        return getPage(pageable);
    }

    @Override
    public UserResponse update(String id, UpdateUserRequest request) {
        return update(id, request, null);
    }

    public UserResponse update(String id, UpdateUserRequest request, String actorUserId) {
        User user = findUserById(id);
        String previousEmail = user.getEmail();
        String previousFullName = user.getFullName();
        String previousRoleId = user.getRoleId();

        if (request.email() != null) {
            String email = TextUtils.trim(request.email());
            if (userRepository.existsByEmailAndIdNotAndDeletedFalse(email, id)) throw new AppException(ErrorCode.CONFLICT, "Email already exists.");
            user.setEmail(email);
        }
        if (request.password() != null) user.setPassword(encodePassword(request.password()));
        if (request.fullName() != null) user.setFullName(TextUtils.trim(request.fullName()));
        if (request.avatarUrl() != null) user.setAvatarUrl(resolveAvatarUrl(request.avatarUrl()));
        if (request.roleId() != null) user.setRoleId(TextUtils.trimToNull(request.roleId()));
        if (request.teamId() != null) user.setTeamId(TextUtils.trimToNull(request.teamId()));

        User saved = userRepository.save(user);
        String changedField = null, oldValue = null, newValue = null;

        if (!sameText(previousEmail, saved.getEmail())) {
            changedField = "email"; oldValue = previousEmail; newValue = saved.getEmail();
        } else if (!sameText(previousFullName, saved.getFullName())) {
            changedField = "fullName"; oldValue = previousFullName; newValue = saved.getFullName();
        } else if (!sameText(previousRoleId, saved.getRoleId())) {
            changedField = "roleId"; oldValue = previousRoleId; newValue = saved.getRoleId();
        }

        if (changedField != null) {
            eventPublisher.publishEvent(new ActivityCreatedEvent(
                    this, ActivitySource.USER, saved.getId(), null, null, null,
                    TextUtils.trimToNull(actorUserId), ActivityAction.UPDATE, changedField, oldValue, newValue,
                    "User updated"
            ));
            activityService.logUserUpdated(saved.getId(), actorUserId, changedField, oldValue, newValue);
        }
        return toResponse(saved);
    }

    @Override
    public void delete(String id) {
        delete(id, null);
    }

    public void delete(String id, String actorUserId) {
        User user = findUserById(id);
        String deletedEmail = user.getEmail();
        user.markDeleted();
        userRepository.save(user);

        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.USER, user.getId(), null, null, null,
                TextUtils.trimToNull(actorUserId), ActivityAction.DELETE, null, null, null,
                "User deleted: " + deletedEmail
        ));
        activityService.logUserDeleted(user.getId(), actorUserId, deletedEmail);
    }

    public void updateAvatarUrl(String id, String avatarUrl) {
        User user = findUserById(id);
        user.setAvatarUrl(resolveAvatarUrl(avatarUrl));
        userRepository.save(user);
    }

    public void heartbeat(String userId) {
        presenceService.heartbeat(userId);
    }

    public boolean isSystemAdmin(AuthenticatedUser currentUser) {
        if (currentUser == null || !StringUtils.hasText(currentUser.roleId())) return false;
        return roleRepository.findById(currentUser.roleId())
                .map(RoleEntity::getName)
                .filter(Role.SYSTEM_ADMIN::equals)
                .isPresent();
    }

    public void assertSystemAdmin(AuthenticatedUser currentUser) {
        if (!isSystemAdmin(currentUser)) throw new AppException(ErrorCode.FORBIDDEN, "Only SYSTEM_ADMIN can access this resource.");
    }

    public List<String> getAiPersonnelContextByProject(String projectId) {
        List<String> userIds = projectMemberRepository.findByProjectIdAndIsActiveTrue(projectId)
                .stream().map(ProjectMember::getUserId).toList();
        if (userIds.isEmpty()) return List.of();

        return userRepository.findByIdInAndDeletedFalse(userIds)
                .stream()
                .map(u -> String.format("- ID: %s | Tên: %s | Team: %s", u.getId(), u.getFullName(), u.getTeamId() != null ? u.getTeamId() : "N/A"))
                .toList();
    }

    public List<UnassignedUserResponse> getUnassignedUsers() {
        return userRepository.findByTeamIdIsNullAndDeletedFalse()
                .stream()
                .map(u -> new UnassignedUserResponse(
                        u.getId(),
                        u.getFullName(),
                        u.getEmail(),
                        u.getRoleId(),
                        resolveRoleName(u.getRoleId()),
                        presenceService.isOnline(u.getId()),
                        u.getStatus()
                ))
                .toList();
    }

    private User findUserById(String id) {
        return userRepository.findByIdAndDeletedFalse(TextUtils.trim(id))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found."));
    }

    private String resolveAvatarUrl(String avatarUrl) {
        String normalized = TextUtils.trimToNull(avatarUrl);
        return StringUtils.hasText(normalized) ? normalized : "https://ui-avatars.com/api/?name=User&background=random";
    }

    private String encodePassword(String rawPassword) {
        String normalized = TextUtils.trimToNull(rawPassword);
        if (!StringUtils.hasText(normalized)) throw new AppException(ErrorCode.BAD_REQUEST, "Password must not be blank.");
        return passwordEncoder.encode(normalized);
    }

    private boolean sameText(String first, String second) {
        String f = TextUtils.trimToNull(first);
        String s = TextUtils.trimToNull(second);
        return f == null ? s == null : f.equals(s);
    }

    private String resolveRoleName(String roleId) {
        if (!StringUtils.hasText(roleId)) return null;
        return roleRepository.findById(roleId).map(RoleEntity::getName).map(Enum::name).orElse(null);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getRoleId(),
                resolveRoleName(user.getRoleId()),
                user.getTeamId(),
                user.getDepartmentId(),
                user.getStatus(),
                presenceService.isOnline(user.getId()),
                presenceService.getLastSeenAt(user.getId()),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
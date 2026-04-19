package com.fluxboard.user.service;

import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.user.dto.request.CreateUserRequest;
import com.fluxboard.user.dto.request.UpdateUserRequest;
import com.fluxboard.user.dto.response.UserResponse;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import com.fluxboard.project.repository.ProjectMemberRepository;
import com.fluxboard.project.entity.ProjectMember;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class UserService implements CrudService<UserResponse, String, CreateUserRequest, UpdateUserRequest> {

    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, ProjectMemberRepository projectMemberRepository) {
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @Override
    public UserResponse create(CreateUserRequest request) {
        String email = TextUtils.trim(request.email());
        if (userRepository.existsByEmailAndDeletedFalse(email)) {
            throw new AppException(ErrorCode.CONFLICT, "Email already exists.");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(encodePassword(request.password()));
        user.setFullName(TextUtils.trim(request.fullName()));
        user.setAvatarUrl(resolveAvatarUrl(request.avatarUrl()));
        user.setRoleId(TextUtils.trimToNull(request.roleId()));
        user.setDepartmentId(TextUtils.trimToNull(request.departmentId()));
        user.setTeamId(TextUtils.trimToNull(request.teamId()));

        return toResponse(userRepository.save(user));
    }

    @Override
    public UserResponse getById(String id) {
        return toResponse(findUserById(id));
    }

    @Override
    public Page<UserResponse> getPage(Pageable pageable) {
        return userRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    @Override
    public UserResponse update(String id, UpdateUserRequest request) {
        User user = findUserById(id);

        if (request.email() != null) {
            String email = TextUtils.trim(request.email());
            if (userRepository.existsByEmailAndIdNotAndDeletedFalse(email, id)) {
                throw new AppException(ErrorCode.CONFLICT, "Email already exists.");
            }
            user.setEmail(email);
        }

        if (request.password() != null) {
            user.setPassword(encodePassword(request.password()));
        }

        if (request.fullName() != null) {
            user.setFullName(TextUtils.trim(request.fullName()));
        }

        if (request.avatarUrl() != null) {
            user.setAvatarUrl(resolveAvatarUrl(request.avatarUrl()));
        }

        if (request.roleId() != null) {
            user.setRoleId(TextUtils.trimToNull(request.roleId()));
        }

        if (request.departmentId() != null) {
            user.setDepartmentId(TextUtils.trimToNull(request.departmentId()));
        }

        if (request.teamId() != null) {
            user.setTeamId(TextUtils.trimToNull(request.teamId()));
        }

        return toResponse(userRepository.save(user));
    }

    @Override
    public void delete(String id) {
        User user = findUserById(id);
        user.markDeleted();
        userRepository.save(user);
    }

    public void updateAvatarUrl(String id, String avatarUrl) {
        User user = findUserById(id);
        user.setAvatarUrl(resolveAvatarUrl(avatarUrl));
        userRepository.save(user);
    }

    public List<String> getAiPersonnelContextByProject(String projectId) {
        List<String> userIds = projectMemberRepository.findByProjectIdAndIsActiveTrue(projectId)
                .stream()
                .map(ProjectMember::getUserId)
                .toList();

        if (userIds.isEmpty()) {
            return List.of();
        }

        return userRepository.findByIdInAndDeletedFalse(userIds)
                .stream()
                .map(u -> String.format("- ID: %s | Tên: %s | Team: %s", 
                        u.getId(), 
                        u.getFullName(), 
                        u.getTeamId() != null ? u.getTeamId() : "N/A"))
                .toList();
    }

    private User findUserById(String id) {
        return userRepository.findByIdAndDeletedFalse(TextUtils.trim(id))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found."));
    }

    private String resolveAvatarUrl(String avatarUrl) {
        String normalized = TextUtils.trimToNull(avatarUrl);
        if (StringUtils.hasText(normalized)) {
            return normalized;
        }
        return "https://ui-avatars.com/api/?name=User&background=random";
    }

    private String encodePassword(String rawPassword) {
        String normalized = TextUtils.trimToNull(rawPassword);
        if (!StringUtils.hasText(normalized)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Password must not be blank.");
        }
        return passwordEncoder.encode(normalized);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getRoleId(),
                user.getDepartmentId(),
                user.getTeamId(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
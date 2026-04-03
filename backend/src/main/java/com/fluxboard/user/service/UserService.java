package com.fluxboard.user.service;

import com.fluxboard.common.service.CrudService;
import com.fluxboard.user.dto.request.UserCreateRequest;
import com.fluxboard.user.dto.request.UserUpdateRequest;
import com.fluxboard.user.dto.response.UserResponse;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class UserService implements CrudService<UserResponse, String, UserCreateRequest, UserUpdateRequest> {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserResponse create(UserCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setFullName(request.getFullName());

        if (request.getAvatarUrl() != null && !request.getAvatarUrl().trim().isEmpty()) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        user.setRoleId(request.getRoleId());
        user.setDepartmentId(request.getDepartmentId());
        user.setTeamId(request.getTeamId());

        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    @Override
    public UserResponse getById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToResponse(user);
    }

    @Override
    public Page<UserResponse> getPage(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    public UserResponse update(String id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getFullName() != null)
            user.setFullName(request.getFullName());
        if (request.getAvatarUrl() != null)
            user.setAvatarUrl(request.getAvatarUrl());
        if (request.getRoleId() != null)
            user.setRoleId(request.getRoleId());
        if (request.getDepartmentId() != null)
            user.setDepartmentId(request.getDepartmentId());
        if (request.getTeamId() != null)
            user.setTeamId(request.getTeamId());

        User updateUser = userRepository.save(user);
        return mapToResponse(updateUser);
    }

    @Override
    public void delete(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.markDeleted();
        userRepository.save(user);
    }

    private UserResponse mapToResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setRoleId(user.getRoleId());
        response.setDepartmentId(user.getDepartmentId());
        response.setTeamId(user.getTeamId());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        response.setDeleted(user.isDeleted());
        return response;
    }
}
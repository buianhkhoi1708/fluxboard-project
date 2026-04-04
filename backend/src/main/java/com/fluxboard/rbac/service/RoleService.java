package com.fluxboard.rbac.service;

import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.rbac.dto.request.CreateRoleRequest;
import com.fluxboard.rbac.dto.request.UpdateRoleRequest;
import com.fluxboard.rbac.dto.response.RoleResponse;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.repository.RolePermissionRepository;
import com.fluxboard.rbac.repository.RoleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class RoleService implements CrudService<RoleResponse, String, CreateRoleRequest, UpdateRoleRequest> {

    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public RoleService(RoleRepository roleRepository, RolePermissionRepository rolePermissionRepository) {
        this.roleRepository = roleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    @Override
    public RoleResponse create(CreateRoleRequest request) {
        if (roleRepository.existsByNameAndScope(request.name(), request.scope())) {
            throw new AppException(ErrorCode.CONFLICT, "Role with same name and scope already exists.");
        }

        RoleEntity entity = new RoleEntity();
        entity.setName(request.name());
        entity.setScope(request.scope());
        entity.setDescription(TextUtils.trimToNull(request.description()));

        return toResponse(roleRepository.save(entity));
    }

    @Override
    public RoleResponse getById(String id) {
        return toResponse(findRoleById(id));
    }

    @Override
    public Page<RoleResponse> getPage(Pageable pageable) {
        return roleRepository.findAll(pageable).map(this::toResponse);
    }

    @Override
    public RoleResponse update(String id, UpdateRoleRequest request) {
        RoleEntity entity = findRoleById(id);

        if (roleRepository.existsByNameAndScopeAndIdNot(request.name(), request.scope(), id)) {
            throw new AppException(ErrorCode.CONFLICT, "Role with same name and scope already exists.");
        }

        entity.setName(request.name());
        entity.setScope(request.scope());
        entity.setDescription(TextUtils.trimToNull(request.description()));

        return toResponse(roleRepository.save(entity));
    }

    @Override
    public void delete(String id) {
        RoleEntity entity = findRoleById(id);
        rolePermissionRepository.deleteByRoleId(entity.getId());
        roleRepository.delete(entity);
    }

    RoleEntity findRoleById(String id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Role not found."));
    }

    private RoleResponse toResponse(RoleEntity entity) {
        return new RoleResponse(
                entity.getId(),
                entity.getName(),
                entity.getScope(),
                entity.getDescription(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}

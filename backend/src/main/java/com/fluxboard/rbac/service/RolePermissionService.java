package com.fluxboard.rbac.service;

import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.rbac.dto.response.PermissionResponse;
import com.fluxboard.rbac.dto.response.RolePermissionResponse;
import com.fluxboard.rbac.entity.PermissionEntity;
import com.fluxboard.rbac.entity.RolePermissionEntity;
import com.fluxboard.rbac.repository.PermissionRepository;
import com.fluxboard.rbac.repository.RolePermissionRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class RolePermissionService {

    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionRepository permissionRepository;
    private final RoleService roleService;
    private final PermissionService permissionService;

    public RolePermissionService(
            RolePermissionRepository rolePermissionRepository,
            PermissionRepository permissionRepository,
            RoleService roleService,
            PermissionService permissionService
    ) {
        this.rolePermissionRepository = rolePermissionRepository;
        this.permissionRepository = permissionRepository;
        this.roleService = roleService;
        this.permissionService = permissionService;
    }

    public RolePermissionResponse assignPermissionToRole(String roleId, String permissionId) {
        roleService.findRoleById(roleId);
        permissionService.findPermissionById(permissionId);

        if (rolePermissionRepository.existsByRoleIdAndPermissionId(roleId, permissionId)) {
            throw new AppException(ErrorCode.CONFLICT, "Permission is already assigned to role.");
        }

        RolePermissionEntity entity = new RolePermissionEntity();
        entity.setRoleId(roleId);
        entity.setPermissionId(permissionId);

        RolePermissionEntity saved = rolePermissionRepository.save(entity);
        return toRolePermissionResponse(saved);
    }

    public void removePermissionFromRole(String roleId, String permissionId) {
        roleService.findRoleById(roleId);
        permissionService.findPermissionById(permissionId);

        if (!rolePermissionRepository.existsByRoleIdAndPermissionId(roleId, permissionId)) {
            throw new AppException(ErrorCode.NOT_FOUND, "Role permission mapping not found.");
        }

        rolePermissionRepository.deleteByRoleIdAndPermissionId(roleId, permissionId);
    }

    public List<PermissionResponse> getPermissionsByRoleId(String roleId) {
        roleService.findRoleById(roleId);
        List<RolePermissionEntity> mappings = rolePermissionRepository.findByRoleId(roleId);

        if (mappings.isEmpty()) {
            return List.of();
        }

        List<String> permissionIds = mappings.stream()
                .map(RolePermissionEntity::getPermissionId)
                .toList();

        List<PermissionEntity> permissions = permissionRepository.findAllById(permissionIds);
        Map<String, PermissionEntity> permissionById = permissions.stream()
                .collect(Collectors.toMap(PermissionEntity::getId, permission -> permission));

        return permissionIds.stream()
                .map(permissionById::get)
                .filter(permission -> permission != null)
                .map(this::toPermissionResponse)
                .toList();
    }

    private RolePermissionResponse toRolePermissionResponse(RolePermissionEntity entity) {
        return new RolePermissionResponse(
                entity.getId(),
                entity.getRoleId(),
                entity.getPermissionId(),
                entity.getCreatedAt()
        );
    }

    private PermissionResponse toPermissionResponse(PermissionEntity entity) {
        return new PermissionResponse(
                entity.getId(),
                entity.getCode(),
                entity.getModule(),
                entity.getDescription(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}

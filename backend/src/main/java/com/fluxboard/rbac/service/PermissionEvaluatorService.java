package com.fluxboard.rbac.service;

import com.fluxboard.common.util.TextUtils;
import com.fluxboard.rbac.entity.PermissionEntity;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.repository.PermissionRepository;
import com.fluxboard.rbac.repository.RolePermissionRepository;
import com.fluxboard.rbac.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class PermissionEvaluatorService {

    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final RoleRepository roleRepository;

    public PermissionEvaluatorService(
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository,
            RoleRepository roleRepository) {
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.roleRepository = roleRepository;
    }

    public boolean hasPermission(String roleId, String permissionCode) {
        if (!StringUtils.hasText(roleId) || !StringUtils.hasText(permissionCode)) {
            return false;
        }

        RoleEntity role = roleRepository.findById(TextUtils.trim(roleId)).orElse(null);
        if (role != null && role.getName() == Role.SYSTEM_ADMIN) {
            return true;
        }

        PermissionEntity permission = permissionRepository.findByCode(TextUtils.trim(permissionCode)).orElse(null);
        if (permission == null) {
            return false;
        }

        return rolePermissionRepository.existsByRoleIdAndPermissionId(TextUtils.trim(roleId), permission.getId());
    }
}

package com.fluxboard.rbac.repository;

import com.fluxboard.rbac.entity.RolePermissionEntity;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RolePermissionRepository extends MongoRepository<RolePermissionEntity, String> {

    boolean existsByRoleIdAndPermissionId(String roleId, String permissionId);

    List<RolePermissionEntity> findByRoleId(String roleId);

    void deleteByRoleIdAndPermissionId(String roleId, String permissionId);

    void deleteByRoleId(String roleId);

    void deleteByPermissionId(String permissionId);
}

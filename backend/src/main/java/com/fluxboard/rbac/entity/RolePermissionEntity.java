package com.fluxboard.rbac.entity;

import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "role_permissions")
@CompoundIndex(name = "uniq_role_permission", def = "{'role_id': 1, 'permission_id': 1}", unique = true)
public class RolePermissionEntity extends BaseDocument {

    @Field("role_id")
    private String roleId;

    @Field("permission_id")
    private String permissionId;

    public String getRoleId() {
        return roleId;
    }

    public void setRoleId(String roleId) {
        this.roleId = roleId;
    }

    public String getPermissionId() {
        return permissionId;
    }

    public void setPermissionId(String permissionId) {
        this.permissionId = permissionId;
    }
}

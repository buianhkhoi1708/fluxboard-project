package com.fluxboard.rbac.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.rbac.dto.request.CreatePermissionRequest;
import com.fluxboard.rbac.dto.request.CreateRoleRequest;
import com.fluxboard.rbac.dto.request.UpdatePermissionRequest;
import com.fluxboard.rbac.dto.request.UpdateRoleRequest;
import com.fluxboard.rbac.dto.response.PermissionResponse;
import com.fluxboard.rbac.dto.response.RolePermissionResponse;
import com.fluxboard.rbac.dto.response.RoleResponse;
import com.fluxboard.rbac.service.PermissionService;
import com.fluxboard.rbac.service.RolePermissionService;
import com.fluxboard.rbac.service.RoleService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rbac")
public class RbacController {

    private final RoleService roleService;
    private final PermissionService permissionService;
    private final RolePermissionService rolePermissionService;

    public RbacController(
            RoleService roleService,
            PermissionService permissionService,
            RolePermissionService rolePermissionService
    ) {
        this.roleService = roleService;
        this.permissionService = permissionService;
        this.rolePermissionService = rolePermissionService;
    }

    @PostMapping("/roles")
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(@Valid @RequestBody CreateRoleRequest request) {
        RoleResponse result = roleService.create(request);
        return ResponseFactory.created("Role created successfully.", result);
    }

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getRoles(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<RoleResponse> page = roleService.getPage(pageable);
        return ResponseFactory.paged("Roles retrieved successfully.", page);
    }

    @GetMapping("/roles/{roleId}")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(@PathVariable String roleId) {
        return ResponseFactory.ok("Role retrieved successfully.", roleService.getById(roleId));
    }

    @PutMapping("/roles/{roleId}")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRole(
            @PathVariable String roleId,
            @Valid @RequestBody UpdateRoleRequest request
    ) {
        return ResponseFactory.ok("Role updated successfully.", roleService.update(roleId, request));
    }

    @DeleteMapping("/roles/{roleId}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable String roleId) {
        roleService.delete(roleId);
        return ResponseFactory.ok("Role deleted successfully.");
    }

    @PostMapping("/permissions")
    public ResponseEntity<ApiResponse<PermissionResponse>> createPermission(
            @Valid @RequestBody CreatePermissionRequest request
    ) {
        PermissionResponse result = permissionService.create(request);
        return ResponseFactory.created("Permission created successfully.", result);
    }

    @GetMapping("/permissions")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getPermissions(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<PermissionResponse> page = permissionService.getPage(pageable);
        return ResponseFactory.paged("Permissions retrieved successfully.", page);
    }

    @GetMapping("/permissions/{permissionId}")
    public ResponseEntity<ApiResponse<PermissionResponse>> getPermissionById(@PathVariable String permissionId) {
        return ResponseFactory.ok("Permission retrieved successfully.", permissionService.getById(permissionId));
    }

    @PutMapping("/permissions/{permissionId}")
    public ResponseEntity<ApiResponse<PermissionResponse>> updatePermission(
            @PathVariable String permissionId,
            @Valid @RequestBody UpdatePermissionRequest request
    ) {
        return ResponseFactory.ok("Permission updated successfully.", permissionService.update(permissionId, request));
    }

    @DeleteMapping("/permissions/{permissionId}")
    public ResponseEntity<ApiResponse<Void>> deletePermission(@PathVariable String permissionId) {
        permissionService.delete(permissionId);
        return ResponseFactory.ok("Permission deleted successfully.");
    }

    @PostMapping("/roles/{roleId}/permissions/{permissionId}")
    public ResponseEntity<ApiResponse<RolePermissionResponse>> assignPermissionToRole(
            @PathVariable String roleId,
            @PathVariable String permissionId
    ) {
        RolePermissionResponse response = rolePermissionService.assignPermissionToRole(roleId, permissionId);
        return ResponseFactory.created("Permission assigned to role successfully.", response);
    }

    @DeleteMapping("/roles/{roleId}/permissions/{permissionId}")
    public ResponseEntity<ApiResponse<Void>> removePermissionFromRole(
            @PathVariable String roleId,
            @PathVariable String permissionId
    ) {
        rolePermissionService.removePermissionFromRole(roleId, permissionId);
        return ResponseFactory.ok("Permission removed from role successfully.");
    }

    @GetMapping("/roles/{roleId}/permissions")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getPermissionsByRole(@PathVariable String roleId) {
        return ResponseFactory.ok(
                "Role permissions retrieved successfully.",
                rolePermissionService.getPermissionsByRoleId(roleId)
        );
    }
}

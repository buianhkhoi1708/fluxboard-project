package com.fluxboard.organization.department.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.organization.department.dto.request.CreateDepartmentRequest;
import com.fluxboard.organization.department.dto.request.UpdateDepartmentRequest;
import com.fluxboard.organization.department.dto.response.OrganizationDepartmentResponse;
import com.fluxboard.organization.department.service.DepartmentService;
import com.fluxboard.rbac.annotation.RequirePermission;
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
@RequestMapping("/organizations/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @RequirePermission("DEPARTMENT_CREATE")
    @PostMapping
    public ResponseEntity<ApiResponse<OrganizationDepartmentResponse>> createDepartment(
            @Valid @RequestBody CreateDepartmentRequest request
    ) {
        return ResponseFactory.created(
                "Department created successfully.",
                departmentService.create(request));
    }

    @RequirePermission("DEPARTMENT_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrganizationDepartmentResponse>>> getDepartments(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<OrganizationDepartmentResponse> page = departmentService.getPage(pageable);
        return ResponseFactory.paged("Departments retrieved successfully.", page);
    }

    @RequirePermission("DEPARTMENT_VIEW")
    @GetMapping("/{departmentId}")
    public ResponseEntity<ApiResponse<OrganizationDepartmentResponse>> getDepartmentById(
            @PathVariable String departmentId
    ) {
        return ResponseFactory.ok(
                "Department retrieved successfully.",
                departmentService.getById(departmentId));
    }

    @RequirePermission("DEPARTMENT_UPDATE")
    @PutMapping("/{departmentId}")
    public ResponseEntity<ApiResponse<OrganizationDepartmentResponse>> updateDepartment(
            @PathVariable String departmentId,
            @Valid @RequestBody UpdateDepartmentRequest request
    ) {
        return ResponseFactory.ok(
                "Department updated successfully.",
                departmentService.update(departmentId, request));
    }

    @RequirePermission("DEPARTMENT_DELETE")
    @DeleteMapping("/{departmentId}")
    public ResponseEntity<ApiResponse<Void>> deleteDepartment(@PathVariable String departmentId) {
        departmentService.delete(departmentId);
        return ResponseFactory.ok("Department deleted successfully.");
    }
}

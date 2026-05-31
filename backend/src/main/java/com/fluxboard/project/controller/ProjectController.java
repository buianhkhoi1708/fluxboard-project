package com.fluxboard.project.controller;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.ai.dto.response.AiInsightResponse;
import com.fluxboard.ai.service.AiService;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.project.dto.request.CreateProjectRequest;
import com.fluxboard.project.dto.request.UpdateProjectRequest;
import com.fluxboard.project.dto.response.ProjectOverviewResponse;
import com.fluxboard.project.dto.response.ProjectResponse;
import com.fluxboard.project.service.ProjectService;
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
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final AiService aiService; 

    public ProjectController(ProjectService projectService, AiService aiService) {
        this.projectService = projectService;
        this.aiService = aiService;
    }

    @RequirePermission("PROJECT_CREATE")
    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        return ResponseFactory.created(
                "Project created successfully.",
                projectService.create(request, authUser.userId())
        );
    }

    // 🚀 ĐÃ SỬA: Thêm biến authUser và truyền xuống Service
    @RequirePermission("PROJECT_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getProjects(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        Page<ProjectResponse> page = projectService.getPage(authUser, pageable);
        return ResponseFactory.paged("Projects retrieved successfully.", page);
    }

    @RequirePermission("PROJECT_VIEW")
    @GetMapping("/{projectId}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProjectById(@PathVariable String projectId) {
        return ResponseFactory.ok("Project retrieved successfully.", projectService.getById(projectId));
    }

    @RequirePermission("PROJECT_VIEW")
    @GetMapping("/{projectId}/overview")
    public ResponseEntity<ApiResponse<ProjectOverviewResponse>> getProjectOverview(@PathVariable String projectId) {
        return ResponseFactory.ok("Project overview retrieved successfully.", projectService.getOverview(projectId));
    }

    // 🚀 ĐÃ SỬA: Thêm biến authUser và truyền xuống Service
    @RequirePermission("PROJECT_VIEW")
    @GetMapping("/overviews")
    public ResponseEntity<ApiResponse<List<ProjectOverviewResponse>>> getProjectOverviews(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        
        Page<ProjectOverviewResponse> page = projectService.getPageOverview(authUser, pageable);
        return ResponseFactory.paged("Project overviews retrieved successfully.", page);
    }

    // 🚀 ĐÃ SỬA: Thêm biến authUser và truyền xuống Service
    @RequirePermission("PROJECT_VIEW")
    @GetMapping("/departments/{departmentId}")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getProjectsByDepartment(
            @PathVariable String departmentId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        Page<ProjectResponse> page = projectService.getPageByDepartment(departmentId, authUser, pageable);
        return ResponseFactory.paged("Department projects retrieved successfully.", page);
    }

    @RequirePermission("PROJECT_UPDATE")
    @PutMapping("/{projectId}")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
            @PathVariable String projectId,
            @Valid @RequestBody UpdateProjectRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        return ResponseFactory.ok("Project updated successfully.", projectService.update(projectId, request, authUser.userId()));
    }

    @RequirePermission("PROJECT_DELETE")
    @DeleteMapping("/{projectId}")
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @PathVariable String projectId,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        projectService.delete(projectId, authUser.userId());
        return ResponseFactory.ok("Project deleted successfully.");
    }

    @RequirePermission("PROJECT_VIEW") 
    @GetMapping("/{projectId}/ai-insights")
    public ResponseEntity<ApiResponse<List<AiInsightResponse>>> getAiInsights(@PathVariable String projectId) {
        return ResponseFactory.ok(
                "AI insights retrieved successfully.", 
                aiService.getDeviationInsights(projectId)
        );
    }
}
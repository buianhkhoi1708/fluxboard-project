package com.fluxboard.project.projectmember.controller;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.board.task.dto.response.TaskUserSummaryResponse;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.project.projectmember.dto.request.AddProjectMemberRequest;
import com.fluxboard.project.projectmember.dto.request.UpdateProjectMemberRequest;
import com.fluxboard.project.projectmember.dto.response.ProjectMemberResponse;
import com.fluxboard.project.projectmember.service.ProjectMemberService;
import com.fluxboard.project.service.ProjectService;
import com.fluxboard.rbac.annotation.RequirePermission;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects/{projectId}")
public class ProjectMemberController {

    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;

    public ProjectMemberController(ProjectService projectService, ProjectMemberService projectMemberService) {
        this.projectService = projectService;
        this.projectMemberService = projectMemberService;
    }

    @RequirePermission("PROJECT_VIEW")
    @GetMapping("/members/summary")
    public ResponseEntity<ApiResponse<List<TaskUserSummaryResponse>>> getProjectMembersSummary(@PathVariable String projectId) {
        return ResponseFactory.ok(
                "Project members retrieved successfully.",
                projectService.getProjectMembers(projectId)
        );
    }

    @RequirePermission("PROJECT_VIEW")
    @GetMapping("/members")
    public ResponseEntity<ApiResponse<List<ProjectMemberResponse>>> getProjectMembers(@PathVariable String projectId) {
        return ResponseFactory.ok(
                "Project member details retrieved successfully.",
                projectMemberService.getMembers(projectId)
        );
    }

    @RequirePermission("PROJECT_VIEW")
    @GetMapping("/members/{userId}")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> getProjectMemberById(
            @PathVariable String projectId,
            @PathVariable("userId") String userId
    ) {
        return ResponseFactory.ok(
                "Project member retrieved successfully.",
                projectMemberService.getMemberById(projectId, userId)
        );
    }

    @RequirePermission("PROJECT_UPDATE")
    @PostMapping("/members")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> addProjectMember(
            @PathVariable String projectId,
            @Valid @RequestBody AddProjectMemberRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        return ResponseFactory.ok(
                "Member added to project successfully.",
                projectMemberService.addMember(projectId, request, authUser.userId())
        );
    }

    @RequirePermission("PROJECT_UPDATE")
    @PutMapping("/members/{userId}")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> updateProjectMember(
            @PathVariable String projectId,
            @PathVariable("userId") String userId,
            @RequestBody UpdateProjectMemberRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        return ResponseFactory.ok(
                "Project member updated successfully.",
                projectMemberService.updateMember(projectId, userId, request, authUser.userId())
        );
    }

    @RequirePermission("PROJECT_UPDATE")
    @DeleteMapping("/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeProjectMember(
            @PathVariable String projectId,
            @PathVariable("userId") String userId,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        projectMemberService.removeMember(projectId, userId, authUser.userId());
        return ResponseFactory.ok("Project member removed successfully.");
    }
}

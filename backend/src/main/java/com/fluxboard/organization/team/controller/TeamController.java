package com.fluxboard.organization.team.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.organization.team.dto.request.CreateTeamRequest;
import com.fluxboard.organization.team.dto.request.UpdateTeamRequest;
import com.fluxboard.organization.team.dto.response.OrganizationTeamResponse;
import com.fluxboard.organization.team.service.TeamService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/organizations/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @RequirePermission("TEAM_CREATE")
    @PostMapping
    public ResponseEntity<ApiResponse<OrganizationTeamResponse>> createTeam(
            @Valid @RequestBody CreateTeamRequest request
    ) {
        return ResponseFactory.created(
                "Team created successfully.",
                teamService.create(request));
    }

    @RequirePermission("TEAM_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrganizationTeamResponse>>> getTeams(
            @RequestParam(required = false) String departmentId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<OrganizationTeamResponse> page = departmentId == null || departmentId.isBlank()
                ? teamService.getPage(pageable)
                : teamService.getPageByDepartment(departmentId, pageable);
        return ResponseFactory.paged("Teams retrieved successfully.", page);
    }

    @RequirePermission("TEAM_VIEW")
    @GetMapping("/{teamId}")
    public ResponseEntity<ApiResponse<OrganizationTeamResponse>> getTeamById(@PathVariable String teamId) {
        return ResponseFactory.ok("Team retrieved successfully.", teamService.getById(teamId));
    }

    @RequirePermission("TEAM_UPDATE")
    @PutMapping("/{teamId}")
    public ResponseEntity<ApiResponse<OrganizationTeamResponse>> updateTeam(
            @PathVariable String teamId,
            @Valid @RequestBody UpdateTeamRequest request
    ) {
        return ResponseFactory.ok(
                "Team updated successfully.",
                teamService.update(teamId, request));
    }

    @RequirePermission("TEAM_DELETE")
    @DeleteMapping("/{teamId}")
    public ResponseEntity<ApiResponse<Void>> deleteTeam(@PathVariable String teamId) {
        teamService.delete(teamId);
        return ResponseFactory.ok("Team deleted successfully.");
    }
}

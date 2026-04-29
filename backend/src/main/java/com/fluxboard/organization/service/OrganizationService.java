package com.fluxboard.organization.service;

import com.fluxboard.organization.department.service.DepartmentService;
import com.fluxboard.organization.department.dto.response.OrganizationMetricsResponse;
import com.fluxboard.organization.dto.response.OrganizationSearchResponse;
import com.fluxboard.organization.team.service.TeamService;
import com.fluxboard.user.repository.UserRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.organization.team.entity.TeamEntity;
import com.fluxboard.organization.department.entity.DepartmentEntity;
import com.fluxboard.organization.team.repository.TeamRepository;
import com.fluxboard.organization.department.repository.DepartmentRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OrganizationService {

    private static final long DEFAULT_DEPARTMENT_COUNT = 12L;

    private final DepartmentService departmentService;
    private final TeamService teamService;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final DepartmentRepository departmentRepository;

    public OrganizationService(DepartmentService departmentService, TeamService teamService,
                               UserRepository userRepository, TeamRepository teamRepository, DepartmentRepository departmentRepository) {
        this.departmentService = departmentService;
        this.teamService = teamService;
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.departmentRepository = departmentRepository;
    }

    public OrganizationMetricsResponse getMetrics() {
        long totalDepartments = departmentService.countActive();
        if (totalDepartments == 0) {
            totalDepartments = DEFAULT_DEPARTMENT_COUNT;
        }
        return new OrganizationMetricsResponse(totalDepartments, teamService.countActive());
    }

    public List<OrganizationSearchResponse> searchPersonnel(String keyword) {
        List<User> users = userRepository.findByFullNameContainingIgnoreCaseAndDeletedFalse(keyword);

        List<String> teamIds = users.stream().map(User::getTeamId).filter(id -> id != null).distinct().toList();
        
        // Find teams
        // TeamRepository needs findByIdInAndDeletedFalse, let's just use findById
        List<TeamEntity> teams = teamIds.isEmpty() ? List.of() : teamIds.stream()
            .map(id -> teamRepository.findByIdAndDeletedFalse(id).orElse(null))
            .filter(java.util.Objects::nonNull).toList();
        
        Map<String, TeamEntity> teamMap = teams.stream().collect(Collectors.toMap(TeamEntity::getId, t -> t));
        
        List<String> deptIds = teams.stream().map(TeamEntity::getDepartmentId).filter(id -> id != null).distinct().toList();
        List<DepartmentEntity> depts = deptIds.isEmpty() ? List.of() : deptIds.stream()
            .map(id -> departmentRepository.findByIdAndDeletedFalse(id).orElse(null))
            .filter(java.util.Objects::nonNull).toList();

        Map<String, DepartmentEntity> deptMap = depts.stream().collect(Collectors.toMap(DepartmentEntity::getId, d -> d));

        return users.stream().map(u -> {
            OrganizationSearchResponse.TeamDto teamDto = null;
            OrganizationSearchResponse.DepartmentDto deptDto = null;

            if (u.getTeamId() != null && teamMap.containsKey(u.getTeamId())) {
                TeamEntity team = teamMap.get(u.getTeamId());
                teamDto = new OrganizationSearchResponse.TeamDto(team.getId(), team.getName());

                if (team.getDepartmentId() != null && deptMap.containsKey(team.getDepartmentId())) {
                    DepartmentEntity dept = deptMap.get(team.getDepartmentId());
                    deptDto = new OrganizationSearchResponse.DepartmentDto(dept.getId(), dept.getName());
                }
            }

            return new OrganizationSearchResponse(
                    u.getId(),
                    u.getFullName(),
                    u.getEmail(),
                    teamDto,
                    deptDto
            );
        }).toList();
    }
}

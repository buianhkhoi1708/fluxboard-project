package com.fluxboard.organization.team.service;

import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.organization.department.service.DepartmentService;
import com.fluxboard.organization.team.dto.request.CreateTeamRequest;
import com.fluxboard.organization.team.dto.request.UpdateTeamRequest;
import com.fluxboard.organization.team.dto.response.OrganizationTeamResponse;
import com.fluxboard.organization.team.entity.TeamEntity;
import com.fluxboard.organization.team.repository.TeamRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class TeamService implements CrudService<
        OrganizationTeamResponse,
        String,
        CreateTeamRequest,
        UpdateTeamRequest> {

    private final TeamRepository teamRepository;
    private final DepartmentService departmentService;

    public TeamService(TeamRepository teamRepository, DepartmentService departmentService) {
        this.teamRepository = teamRepository;
        this.departmentService = departmentService;
    }

    @Override
    public OrganizationTeamResponse create(CreateTeamRequest request) {
        String code = TextUtils.trim(request.code());
        if (teamRepository.existsByCodeAndDeletedFalse(code)) {
            throw new AppException(ErrorCode.CONFLICT, "Team code already exists.");
        }

        String departmentId = TextUtils.trim(request.departmentId());
        if (!departmentService.existsById(departmentId)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Department does not exist.");
        }

        TeamEntity entity = new TeamEntity();
        entity.setName(TextUtils.trim(request.name()));
        entity.setCode(code);
        entity.setDepartmentId(departmentId);
        entity.setDescription(TextUtils.trimToNull(request.description()));

        return toResponse(teamRepository.save(entity));
    }

    @Override
    public OrganizationTeamResponse getById(String id) {
        return toResponse(findById(id));
    }

    @Override
    public Page<OrganizationTeamResponse> getPage(Pageable pageable) {
        return teamRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    public Page<OrganizationTeamResponse> getPageByDepartment(String departmentId, Pageable pageable) {
        String normalizedDepartmentId = TextUtils.trim(departmentId);
        if (!departmentService.existsById(normalizedDepartmentId)) {
            throw new AppException(ErrorCode.NOT_FOUND, "Department not found.");
        }
        return teamRepository.findByDepartmentIdAndDeletedFalse(normalizedDepartmentId, pageable).map(this::toResponse);
    }

    @Override
    public OrganizationTeamResponse update(String id, UpdateTeamRequest request) {
        TeamEntity entity = findById(id);
        String code = TextUtils.trim(request.code());
        if (teamRepository.existsByCodeAndIdNotAndDeletedFalse(code, id)) {
            throw new AppException(ErrorCode.CONFLICT, "Team code already exists.");
        }

        String departmentId = TextUtils.trim(request.departmentId());
        if (!departmentService.existsById(departmentId)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Department does not exist.");
        }

        entity.setName(TextUtils.trim(request.name()));
        entity.setCode(code);
        entity.setDepartmentId(departmentId);
        entity.setDescription(TextUtils.trimToNull(request.description()));

        return toResponse(teamRepository.save(entity));
    }

    @Override
    public void delete(String id) {
        TeamEntity entity = findById(id);
        entity.markDeleted();
        teamRepository.save(entity);
    }

    public long countActive() {
        return teamRepository.countByDeletedFalse();
    }

    private TeamEntity findById(String id) {
        return teamRepository.findByIdAndDeletedFalse(TextUtils.trim(id))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Team not found."));
    }

    private OrganizationTeamResponse toResponse(TeamEntity entity) {
        return new OrganizationTeamResponse(
                entity.getId(),
                entity.getName(),
                entity.getCode(),
                entity.getDepartmentId(),
                entity.getDescription(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}

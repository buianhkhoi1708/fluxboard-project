package com.fluxboard.organization.team.service;

import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.organization.department.service.DepartmentService;
import com.fluxboard.organization.team.dto.request.AssignMemberRequest; // 👈 Import DTO mới
import com.fluxboard.organization.team.dto.request.CreateTeamRequest;
import com.fluxboard.organization.team.dto.request.UpdateTeamRequest;
import com.fluxboard.organization.team.dto.response.OrganizationTeamResponse;
import com.fluxboard.organization.team.entity.TeamEntity;
import com.fluxboard.organization.team.repository.TeamRepository;
import com.fluxboard.user.entity.User; // 👈 Import entity User
import com.fluxboard.user.repository.UserRepository; // 👈 Import repository User
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
    private final UserRepository userRepository; // 🚀 THÊM MỚI: Inject UserRepository

    public TeamService(
            TeamRepository teamRepository, 
            DepartmentService departmentService,
            UserRepository userRepository // 🚀 THÊM MỚI
    ) {
        this.teamRepository = teamRepository;
        this.departmentService = departmentService;
        this.userRepository = userRepository;
    }

    // ==========================================
    // 🚀 THÊM MỚI: Logic gán User vào Team
    // ==========================================
    public void assignMember(String teamId, AssignMemberRequest request) {
        // 1. Kiểm tra xem Team có tồn tại không
        TeamEntity team = findById(teamId);

        // 2. Tìm User trong hệ thống
        String userId = TextUtils.trim(request.getUserId());
        User user = userRepository.findById(userId) 
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found."));

        // 3. Cập nhật Team và Department cho User
        // 🛠 Đã xóa dòng gọi request.getRoleId() gây lỗi
        user.setTeamId(team.getId());
        user.setDepartmentId(team.getDepartmentId());

        // 4. Lưu lại cập nhật
        userRepository.save(user);
    }

    public void removeMember(String teamId, String userId) {
        // 1. Kiểm tra xem Team có tồn tại không
        TeamEntity team = findById(teamId);

        // 2. Tìm User trong hệ thống
        User user = userRepository.findById(TextUtils.trim(userId))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found."));

        // 3. Kiểm tra an toàn: Đảm bảo user này thực sự đang thuộc team này
        if (user.getTeamId() == null || !user.getTeamId().equals(team.getId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "User does not belong to this team.");
        }

        // 4. Xóa User khỏi Team và Department (Trả về trạng thái Unassigned)
        user.setTeamId(null);
        user.setDepartmentId(null);
        // user.setRoleId(null); // (Tùy chọn) Bỏ comment dòng này nếu bạn muốn reset luôn quyền của họ

        // 5. Lưu lại thay đổi
        userRepository.save(user);
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
        entity.setLeadId(TextUtils.trimToNull(request.leadId()));
        if (request.status() != null) entity.setStatus(TextUtils.trim(request.status()));

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

        if (request.name() != null) {
            entity.setName(TextUtils.trim(request.name()));
        }

        if (request.code() != null) {
            String code = TextUtils.trim(request.code());
            if (!entity.getCode().equals(code) && teamRepository.existsByCodeAndDeletedFalse(code)) {
                throw new AppException(ErrorCode.CONFLICT, "Team code already exists.");
            }
            entity.setCode(code);
        }

        if (request.departmentId() != null) {
            String departmentId = TextUtils.trim(request.departmentId());
            if (!entity.getDepartmentId().equals(departmentId) && !departmentService.existsById(departmentId)) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Department does not exist.");
            }
            entity.setDepartmentId(departmentId);
        }

        if (request.description() != null) {
            entity.setDescription(TextUtils.trimToNull(request.description()));
        }
        
        if (request.leadId() != null) {
            entity.setLeadId(TextUtils.trimToNull(request.leadId()));
        }

        if (request.status() != null) {
            entity.setStatus(TextUtils.trim(request.status()));
        }

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
                entity.getLeadId(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
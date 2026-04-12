package com.fluxboard.project.service;

import com.fluxboard.board.column.dto.response.BoardColumnResponse;
import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.dto.response.BoardResponse;
import com.fluxboard.board.entity.BoardEntity;
import com.fluxboard.board.repository.BoardRepository;
import com.fluxboard.board.task.dto.response.TaskUserSummaryResponse;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.dto.request.AddProjectMemberRequest; // 🚀 MỚI THÊM
import com.fluxboard.project.dto.request.CreateProjectRequest;
import com.fluxboard.project.dto.request.UpdateProjectRequest;
import com.fluxboard.project.dto.response.ProjectBoardOverviewResponse;
import com.fluxboard.project.dto.response.ProjectOverviewResponse;
import com.fluxboard.project.dto.response.ProjectResponse;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.entity.ProjectMember;
import com.fluxboard.project.repository.ProjectMemberRepository;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ProjectService
        implements CrudService<ProjectResponse, String, CreateProjectRequest, UpdateProjectRequest> {

    private final ProjectRepository projectRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            BoardRepository boardRepository,
            BoardColumnRepository boardColumnRepository,
            TaskRepository taskRepository,
            UserRepository userRepository,
            ProjectMemberRepository projectMemberRepository
    ) {
        this.projectRepository = projectRepository;
        this.boardRepository = boardRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
    }

    @Override
    @Transactional
    public ProjectResponse create(CreateProjectRequest request) {
        return create(request, null);
    }

    @Transactional
    public ProjectResponse create(CreateProjectRequest request, String ownerUserId) {
        String normalizedOwnerId = requireAuthenticatedUserId(ownerUserId);
        validateUserExists(normalizedOwnerId, "Owner user does not exist.");

        // 1. Lưu ProjectEntity
        ProjectEntity entity = new ProjectEntity();
        entity.setName(TextUtils.trim(request.name()));
        entity.setOwnerId(normalizedOwnerId);
        entity.setDepartmentId(TextUtils.trim(request.departmentId()));
        entity.setStatus(TextUtils.trim(request.status()));
        ProjectEntity savedProject = projectRepository.save(entity);

        // 2. Tự động thêm Owner vào bảng ProjectMember để Frontend có danh sách thành viên
        ProjectMember membership = new ProjectMember();
        membership.setProjectId(savedProject.getId());
        membership.setUserId(normalizedOwnerId);
        membership.setActive(true);
        projectMemberRepository.save(membership);

        return toResponse(savedProject);
    }

    /**
     * API quan trọng để Frontend fetch danh sách "danh bạ" thành viên
     */
    public List<TaskUserSummaryResponse> getProjectMembers(String projectId) {
        // Lấy danh sách ID từ bảng trung gian
        List<ProjectMember> memberships = projectMemberRepository.findByProjectIdAndIsActiveTrue(projectId);
        
        if (memberships.isEmpty()) {
            return List.of();
        }

        List<String> userIds = memberships.stream()
                .map(ProjectMember::getUserId)
                .toList();

        // Lấy thông tin chi tiết (FullName, Avatar) từ bảng User
        return userRepository.findByIdInAndDeletedFalse(userIds).stream()
                .map(user -> new TaskUserSummaryResponse(
                        user.getId(), 
                        user.getFullName(), 
                        user.getAvatarUrl()
                ))
                .toList();
    }

    // =========================================================================
    // 🚀 BỔ SUNG HÀM ADD MEMBER TỪ REQUEST CỦA FRONTEND AI_GENERATOR
    // =========================================================================
    @Transactional
    public void addProjectMember(String projectId, AddProjectMemberRequest request) {
        String normalizedUserId = TextUtils.trim(request.userId());

        // 1. Kiểm tra dự án
        validateProjectExists(projectId);

        // 2. Kiểm tra User có tồn tại không
        validateUserExists(normalizedUserId, "User ID to add does not exist.");

        // 3. Chặn thêm trùng lặp (Idempotent)
        boolean alreadyExists = projectMemberRepository.existsByProjectIdAndUserIdAndDeletedFalse(projectId, normalizedUserId);
        if (alreadyExists) {
            return; // Nếu có rồi thì im lặng bỏ qua, không crash luồng AI của sếp
        }

        // 4. Đăng ký hộ khẩu mới cho User
        ProjectMember newMember = new ProjectMember();
        newMember.setProjectId(projectId);
        newMember.setUserId(normalizedUserId);
        
        List<String> roles = (request.roleIds() != null && !request.roleIds().isEmpty()) 
                             ? request.roleIds() 
                             : List.of("MEMBER");
        newMember.setRoleIds(roles);
        newMember.setActive(true);

        projectMemberRepository.save(newMember);
    }
    // =========================================================================

    @Override
    public ProjectResponse getById(String id) {
        return toResponse(findProjectById(id));
    }

    @Override
    public Page<ProjectResponse> getPage(Pageable pageable) {
        return projectRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    public Page<ProjectResponse> getPageByDepartment(String departmentId, Pageable pageable) {
        return projectRepository.findByDepartmentIdAndDeletedFalse(TextUtils.trim(departmentId), pageable)
                .map(this::toResponse);
    }

    public ProjectOverviewResponse getOverview(String projectId) {
        ProjectEntity project = findProjectById(TextUtils.trim(projectId));
        List<BoardEntity> boards = boardRepository.findByProjectIdAndDeletedFalse(project.getId());

        boards.sort(Comparator.comparing(BoardEntity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));

        List<String> boardIds = boards.stream().map(BoardEntity::getId).toList();

        Map<String, List<BoardColumnResponse>> columnsByBoardId;
        if (boardIds.isEmpty()) {
            columnsByBoardId = Map.of();
        } else {
            List<BoardColumnEntity> boardColumns = boardColumnRepository
                    .findByBoardIdInAndDeletedFalseOrderByBoardIdAscOrderAsc(boardIds);

            columnsByBoardId = boardColumns.stream()
                    .collect(Collectors.groupingBy(
                            BoardColumnEntity::getBoardId,
                            Collectors.mapping(this::toBoardColumnResponse, Collectors.toList())
                    ));
        }

        List<ProjectBoardOverviewResponse> boardOverviews = boards.stream()
                .map(board -> new ProjectBoardOverviewResponse(
                        toBoardResponse(board),
                        columnsByBoardId.getOrDefault(board.getId(), List.of())
                ))
                .toList();

        return new ProjectOverviewResponse(toResponse(project), boardOverviews);
    }

    @Override
    @Transactional
    public ProjectResponse update(String id, UpdateProjectRequest request) {
        ProjectEntity entity = findProjectById(id);
        String ownerId = TextUtils.trim(request.ownerId());
        validateUserExists(ownerId, "Owner user does not exist.");

        entity.setName(TextUtils.trim(request.name()));
        entity.setOwnerId(ownerId);
        entity.setDepartmentId(TextUtils.trim(request.departmentId()));
        entity.setStatus(TextUtils.trim(request.status()));

        return toResponse(projectRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(String id) {
        ProjectEntity entity = findProjectById(id);
        List<BoardEntity> boards = boardRepository.findByProjectIdAndDeletedFalse(entity.getId());

        if (!boards.isEmpty()) {
            List<String> boardIds = boards.stream().map(BoardEntity::getId).toList();
            List<BoardColumnEntity> boardColumns = boardColumnRepository
                    .findByBoardIdInAndDeletedFalseOrderByBoardIdAscOrderAsc(boardIds);

            if (!boardColumns.isEmpty()) {
                List<String> columnIds = boardColumns.stream().map(BoardColumnEntity::getId).toList();
                List<TaskEntity> tasks = taskRepository.findByColumnIdInAndDeletedFalse(columnIds);
                tasks.forEach(TaskEntity::markDeleted);
                taskRepository.saveAll(tasks);

                boardColumns.forEach(BoardColumnEntity::markDeleted);
                boardColumnRepository.saveAll(boardColumns);
            }

            boards.forEach(BoardEntity::markDeleted);
            boardRepository.saveAll(boards);
        }

        entity.markDeleted();
        projectRepository.save(entity);
    }

    public ProjectEntity findProjectById(String projectId) {
        return projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));
    }

    private String requireAuthenticatedUserId(String ownerUserId) {
        String normalizedOwnerUserId = TextUtils.trimToNull(ownerUserId);
        if (normalizedOwnerUserId == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Authenticated user is required.");
        }
        return normalizedOwnerUserId;
    }

    // 🚀 MỚI THÊM: Hàm check Project có tồn tại không
    private void validateProjectExists(String projectId) {
        if (!projectRepository.existsByIdAndDeletedFalse(projectId)) {
            throw new AppException(ErrorCode.NOT_FOUND, "Project not found.");
        }
    }

    private void validateUserExists(String userId, String message) {
        if (!userRepository.existsByIdAndDeletedFalse(userId)) {
            throw new AppException(ErrorCode.BAD_REQUEST, message);
        }
    }

    private ProjectResponse toResponse(ProjectEntity entity) {
        return new ProjectResponse(
                entity.getId(),
                entity.getName(),
                entity.getOwnerId(),
                entity.getDepartmentId(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private BoardResponse toBoardResponse(BoardEntity entity) {
        return new BoardResponse(
                entity.getId(),
                entity.getProjectId(),
                entity.getName(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private BoardColumnResponse toBoardColumnResponse(BoardColumnEntity entity) {
        return new BoardColumnResponse(
                entity.getId(),
                entity.getBoardId(),
                entity.getName(),
                entity.getOrder(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public Page<ProjectOverviewResponse> getPageOverview(Pageable pageable) {
        return projectRepository.findByDeletedFalse(pageable)
                .map(entity -> getOverview(entity.getId()));
    }
}
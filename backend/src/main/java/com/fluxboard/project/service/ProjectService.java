package com.fluxboard.project.service;

import com.fluxboard.activity.service.ActivityService;
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
import com.fluxboard.project.projectmember.dto.request.AddProjectMemberRequest;
import com.fluxboard.project.dto.request.CreateProjectRequest;
import com.fluxboard.project.dto.request.UpdateProjectRequest;
import com.fluxboard.project.dto.response.ProjectBoardOverviewResponse;
import com.fluxboard.project.dto.response.ProjectOverviewResponse;
import com.fluxboard.project.dto.response.ProjectResponse;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.projectmember.entity.ProjectMember;
import com.fluxboard.project.projectmember.repository.ProjectMemberRepository;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.user.repository.UserRepository;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.repository.RoleRepository;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.event.ActivityCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;
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
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    
    // 🚀 THÊM MỚI: RoleRepository để check quyền hạn cho Get List
    private final RoleRepository roleRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            BoardRepository boardRepository,
            BoardColumnRepository boardColumnRepository,
            TaskRepository taskRepository,
            ApplicationEventPublisher eventPublisher,
            UserRepository userRepository,
            ProjectMemberRepository projectMemberRepository,
            RoleRepository roleRepository // 🚀 Khai báo thêm
    ) {
        this.projectRepository = projectRepository;
        this.boardRepository = boardRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.taskRepository = taskRepository;
        this.eventPublisher = eventPublisher;
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.roleRepository = roleRepository;
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

        ProjectEntity entity = new ProjectEntity();
        entity.setName(TextUtils.trim(request.name()));
        entity.setOwnerId(normalizedOwnerId);
        entity.setDepartmentId(TextUtils.trim(request.departmentId()));
        entity.setStatus(TextUtils.trim(request.status()));
        ProjectEntity savedProject = projectRepository.save(entity);

        ProjectMember membership = new ProjectMember();
        membership.setProjectId(savedProject.getId());
        membership.setUserId(normalizedOwnerId);
        membership.setActive(true);
        projectMemberRepository.save(membership);
        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.PROJECT, savedProject.getId(), savedProject.getId(), null, null,
                normalizedOwnerId, ActivityAction.CREATE, null, null, null,
                "Project created: " + savedProject.getName()
        ));

        return toResponse(savedProject);
    }

    public List<TaskUserSummaryResponse> getProjectMembers(String projectId) {
        List<ProjectMember> memberships = projectMemberRepository.findByProjectIdAndIsActiveTrue(projectId);
        
        if (memberships.isEmpty()) {
            return List.of();
        }

        List<String> userIds = memberships.stream()
                .map(ProjectMember::getUserId)
                .toList();

        return userRepository.findByIdInAndDeletedFalse(userIds).stream()
                .map(user -> new TaskUserSummaryResponse(
                        user.getId(), 
                        user.getFullName(), 
                        user.getAvatarUrl()
                ))
                .toList();
    }

    @Transactional
    public void addProjectMember(String projectId, AddProjectMemberRequest request) {
        addProjectMember(projectId, request, null);
    }

    @Transactional
    public void addProjectMember(String projectId, AddProjectMemberRequest request, String actorUserId) {
        String normalizedUserId = TextUtils.trim(request.userId());

        validateProjectExists(projectId);
        validateUserExists(normalizedUserId, "User ID to add does not exist.");

        boolean alreadyExists = projectMemberRepository.existsByProjectIdAndUserIdAndDeletedFalse(projectId, normalizedUserId);
        if (alreadyExists) {
            return; 
        }

        ProjectMember newMember = new ProjectMember();
        newMember.setProjectId(projectId);
        newMember.setUserId(normalizedUserId);
        
        List<String> roles = (request.roleIds() != null && !request.roleIds().isEmpty()) 
                             ? request.roleIds() 
                             : List.of("MEMBER");
        newMember.setRoleIds(roles);
        newMember.setActive(true);

        projectMemberRepository.save(newMember);
        String normalizedRoles = (roles == null || roles.isEmpty()) ? null :
                roles.stream().map(TextUtils::trimToNull).filter(java.util.Objects::nonNull).distinct().collect(java.util.stream.Collectors.joining(", "));
        String msg = normalizedRoles == null ? "Project member added: " + (normalizedUserId == null ? "N/A" : normalizedUserId)
                : "Project member added: " + (normalizedUserId == null ? "N/A" : normalizedUserId) + " (roles: " + normalizedRoles + ")";
        
        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.PROJECT, projectId, projectId, null, null,
                TextUtils.trimToNull(actorUserId), ActivityAction.ADD_MEMBER, "memberId", null, normalizedUserId, msg
        ));
    }

    @Override
    public ProjectResponse getById(String id) {
        return toResponse(findProjectById(id));
    }

    // =========================================================================
    // 🚀 LÕI PHÂN QUYỀN TRUY XUẤT PROJECT DÀNH CHO GET LIST
    // =========================================================================
    
    // Bọc thép check System Admin, y hệt logic bên Dashboard
    private boolean isSystemAdmin(String roleId) {
        if (roleId == null) return false;
        try {
            RoleEntity role = roleRepository.findById(roleId).orElse(null);
            return role != null && role.getName() != null && role.getName().name().toUpperCase().contains("ADMIN");
        } catch (Exception e) {
            return false;
        }
    }

    // Hàm lấy danh sách Project có giới hạn quyền
    private Page<ProjectEntity> getAccessibleProjects(AuthenticatedUser user, Pageable pageable) {
        // Nếu là ADMIN, trả về toàn bộ
        if (isSystemAdmin(user.roleId())) {
            return projectRepository.findByDeletedFalse(pageable);
        }

        // Nếu là Manager/Member, lấy các dự án mà user đang tham gia
        List<String> myProjectIds = projectMemberRepository.findByUserIdAndDeletedFalse(user.userId()).stream()
                .filter(ProjectMember::isActive)
                .map(ProjectMember::getProjectId)
                .distinct()
                .toList();

        // Không tham gia dự án nào thì trả về rỗng
        if (myProjectIds.isEmpty()) {
            return Page.empty(pageable);
        }

        return projectRepository.findByIdInAndDeletedFalse(myProjectIds, pageable);
    }

    // 🚀 CẬP NHẬT: API getPage chính, tiêm AuthenticatedUser vào
    public Page<ProjectResponse> getPage(AuthenticatedUser user, Pageable pageable) {
        return getAccessibleProjects(user, pageable).map(this::toResponse);
    }

    // Cái này interface CrudService ép buộc phải có, không dùng trên Controller nữa
    @Override
    public Page<ProjectResponse> getPage(Pageable pageable) {
        return projectRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    // 🚀 CẬP NHẬT: Lọc Overview
    public Page<ProjectOverviewResponse> getPageOverview(AuthenticatedUser user, Pageable pageable) {
        return getAccessibleProjects(user, pageable).map(entity -> getOverview(entity.getId()));
    }

    // 🚀 CẬP NHẬT: Lọc Department theo quyền
    public Page<ProjectResponse> getPageByDepartment(String departmentId, AuthenticatedUser user, Pageable pageable) {
        if (isSystemAdmin(user.roleId())) {
            return projectRepository.findByDepartmentIdAndDeletedFalse(TextUtils.trim(departmentId), pageable)
                    .map(this::toResponse);
        }

        List<String> myProjectIds = projectMemberRepository.findByUserIdAndDeletedFalse(user.userId()).stream()
                .filter(ProjectMember::isActive)
                .map(ProjectMember::getProjectId)
                .distinct()
                .toList();

        if (myProjectIds.isEmpty()) {
            return Page.empty(pageable);
        }

        return projectRepository.findByDepartmentIdAndIdInAndDeletedFalse(TextUtils.trim(departmentId), myProjectIds, pageable)
                .map(this::toResponse);
    }

    // =========================================================================

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
        return update(id, request, null);
    }

    @Transactional
    public ProjectResponse update(String id, UpdateProjectRequest request, String actorUserId) {
        ProjectEntity entity = findProjectById(id);
        String previousName = entity.getName();
        String previousOwnerId = entity.getOwnerId();
        String previousStatus = entity.getStatus();
        String ownerId = TextUtils.trim(request.ownerId());
        validateUserExists(ownerId, "Owner user does not exist.");

        entity.setName(TextUtils.trim(request.name()));
        entity.setOwnerId(ownerId);
        entity.setDepartmentId(TextUtils.trim(request.departmentId()));
        entity.setStatus(TextUtils.trim(request.status()));

        ProjectEntity saved = projectRepository.save(entity);
        String changedField = null;
        String oldValue = null;
        String newValue = null;

        if (!sameText(previousName, saved.getName())) {
            changedField = "name";
            oldValue = previousName;
            newValue = saved.getName();
        } else if (!sameText(previousOwnerId, saved.getOwnerId())) {
            changedField = "ownerId";
            oldValue = previousOwnerId;
            newValue = saved.getOwnerId();
        } else if (!sameText(previousStatus, saved.getStatus())) {
            changedField = "status";
            oldValue = previousStatus;
            newValue = saved.getStatus();
        }
        if (changedField != null) {
            eventPublisher.publishEvent(new ActivityCreatedEvent(
                    this, ActivitySource.PROJECT, saved.getId(), saved.getId(), null, null,
                    TextUtils.trimToNull(actorUserId), ActivityAction.UPDATE, changedField, oldValue, newValue,
                    "Project updated: " + saved.getName()
            ));
        }
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(String id) {
        delete(id, null);
    }

    @Transactional
    public void delete(String id, String actorUserId) {
        ProjectEntity entity = findProjectById(id);
        String projectName = entity.getName();
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
        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.PROJECT, entity.getId(), entity.getId(), null, null,
                TextUtils.trimToNull(actorUserId), ActivityAction.DELETE, null, null, null,
                "Project deleted: " + projectName
        ));
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

    private boolean sameText(String first, String second) {
        String normalizedFirst = TextUtils.trimToNull(first);
        String normalizedSecond = TextUtils.trimToNull(second);
        if (normalizedFirst == null) {
            return normalizedSecond == null;
        }
        return normalizedFirst.equals(normalizedSecond);
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
}
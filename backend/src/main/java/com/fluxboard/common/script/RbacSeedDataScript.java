package com.fluxboard.common.script;

import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.entity.ProjectMember;
import com.fluxboard.project.repository.ProjectMemberRepository;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.rbac.entity.PermissionEntity;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.entity.RolePermissionEntity;
import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.enums.Scope;
import com.fluxboard.rbac.repository.PermissionRepository;
import com.fluxboard.rbac.repository.RolePermissionRepository;
import com.fluxboard.rbac.repository.RoleRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Order(20)
public class RbacSeedDataScript implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RbacSeedDataScript.class);

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final boolean seedDataEnabled;
    private final String seedAdminEmail;
    private final String seedAdminPassword;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public RbacSeedDataScript(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository,
            UserRepository userRepository,
            ProjectRepository projectRepository,      // Thêm cái này
            ProjectMemberRepository projectMemberRepository,
            @Value("${seeddata:${SEED_DATA:false}}") boolean seedDataEnabled,
            @Value("${SEED_SYSTEM_ADMIN_EMAIL:${SYSTEM_ADMIN_EMAIL:}}") String seedAdminEmail,
            @Value("${SEED_SYSTEM_ADMIN_PASSWORD:${SYSTEM_ADMIN_PASSWORD:}}") String seedAdminPassword
    ) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.seedDataEnabled = seedDataEnabled;
        this.seedAdminEmail = seedAdminEmail;
        this.seedAdminPassword = seedAdminPassword;
        this.projectRepository = projectRepository;             // Gán giá trị vào đây
        this.projectMemberRepository = projectMemberRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!seedDataEnabled) {
            log.info("Seed data disabled. Set SEED_DATA=true (or seeddata=true) to enable.");
            return;
        }

        log.info("Seed data enabled. Seeding RBAC roles, permissions, role-permissions, and system admin user...");

        Map<RoleKey, RoleEntity> rolesByKey = seedRoles();
        Map<String, PermissionEntity> permissionsByCode = seedPermissions();

        int createdRolePermissions = seedRolePermissions(rolesByKey, permissionsByCode);
        boolean createdSystemAdmin = seedSystemAdminUser(rolesByKey);

        seedAiTestingData(rolesByKey);

        log.info(
                "Seed data completed. roles={}, permissions={}, newRolePermissions={}, createdSystemAdmin={}",
                rolesByKey.size(),
                permissionsByCode.size(),
                createdRolePermissions,
                createdSystemAdmin
        );

    }

    private Map<RoleKey, RoleEntity> seedRoles() {
        Map<RoleKey, RoleEntity> result = new LinkedHashMap<>();

        for (RoleSeed roleSeed : roleSeeds()) {
            RoleEntity entity = roleRepository.findByNameAndScope(roleSeed.name(), roleSeed.scope())
                    .orElseGet(() -> {
                        RoleEntity created = new RoleEntity();
                        created.setName(roleSeed.name());
                        created.setScope(roleSeed.scope());
                        created.setDescription(roleSeed.description());
                        return roleRepository.save(created);
                    });

            result.put(new RoleKey(roleSeed.name(), roleSeed.scope()), entity);
        }

        return result;
    }

    private Map<String, PermissionEntity> seedPermissions() {
        Map<String, PermissionEntity> result = new LinkedHashMap<>();

        for (PermissionSeed permissionSeed : permissionSeeds()) {
            String code = TextUtils.trim(permissionSeed.code());

            PermissionEntity entity = permissionRepository.findByCode(code)
                    .orElseGet(() -> {
                        PermissionEntity created = new PermissionEntity();
                        created.setCode(code);
                        created.setModule(TextUtils.trim(permissionSeed.module()));
                        created.setDescription(TextUtils.trimToNull(permissionSeed.description()));
                        return permissionRepository.save(created);
                    });

            result.put(code, entity);
        }

        return result;
    }

    private int seedRolePermissions(
            Map<RoleKey, RoleEntity> rolesByKey,
            Map<String, PermissionEntity> permissionsByCode
    ) {
        int createdCount = 0;

        RoleEntity systemAdminRole = rolesByKey.get(new RoleKey(Role.SYSTEM_ADMIN, Scope.SYSTEM));
        if (systemAdminRole != null) {
            createdCount += assignPermissions(systemAdminRole.getId(), permissionsByCode.keySet(), permissionsByCode);
        }

        Map<RoleKey, Set<String>> matrix = rolePermissionMatrix();
        for (Map.Entry<RoleKey, Set<String>> entry : matrix.entrySet()) {
            RoleEntity role = rolesByKey.get(entry.getKey());
            if (role == null) {
                log.warn("Role not found when seeding role-permissions: {} / {}", entry.getKey().name(), entry.getKey().scope());
                continue;
            }

            createdCount += assignPermissions(role.getId(), entry.getValue(), permissionsByCode);
        }

        return createdCount;
    }

    private int assignPermissions(String roleId, Set<String> permissionCodes, Map<String, PermissionEntity> permissionsByCode) {
        int createdCount = 0;

        for (String permissionCode : permissionCodes) {
            PermissionEntity permission = permissionsByCode.get(permissionCode);
            if (permission == null) {
                log.warn("Permission code '{}' not found during seeding. Skipped.", permissionCode);
                continue;
            }

            if (rolePermissionRepository.existsByRoleIdAndPermissionId(roleId, permission.getId())) {
                continue;
            }

            RolePermissionEntity entity = new RolePermissionEntity();
            entity.setRoleId(roleId);
            entity.setPermissionId(permission.getId());
            rolePermissionRepository.save(entity);
            createdCount++;
        }

        return createdCount;
    }

    private boolean seedSystemAdminUser(Map<RoleKey, RoleEntity> rolesByKey) {
        String normalizedEmail = TextUtils.trimToNull(seedAdminEmail);
        String normalizedPassword = TextUtils.trimToNull(seedAdminPassword);

        if (!StringUtils.hasText(normalizedEmail) || !StringUtils.hasText(normalizedPassword)) {
            throw new IllegalStateException(
                    "SEED_SYSTEM_ADMIN_EMAIL and SEED_SYSTEM_ADMIN_PASSWORD are required when SEED_DATA=true."
            );
        }

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            log.info("System admin user already exists with email '{}'. Skipped.", normalizedEmail);
            return false;
        }

        RoleEntity systemAdminRole = rolesByKey.get(new RoleKey(Role.SYSTEM_ADMIN, Scope.SYSTEM));
        if (systemAdminRole == null) {
            throw new IllegalStateException("SYSTEM_ADMIN role is not available after seeding roles.");
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(normalizedPassword));
        user.setFullName("System Admin");
        user.setRoleId(systemAdminRole.getId());

        userRepository.save(user);
        log.info("System admin user created with email '{}'.", normalizedEmail);
        return true;
    }

    private List<RoleSeed> roleSeeds() {
        return List.of(
                new RoleSeed(Role.SYSTEM_ADMIN, Scope.SYSTEM, "Full control over the whole system"),
                new RoleSeed(Role.ADMIN, Scope.SYSTEM, "Manage users, departments, teams and projects"),
                new RoleSeed(Role.MANAGER, Scope.SYSTEM, "Manage business operations and oversee projects"),
                new RoleSeed(Role.EMPLOYEE, Scope.SYSTEM, "Basic employee access"),
                new RoleSeed(Role.PROJECT_ADMIN, Scope.PROJECT, "Full control within project"),
                new RoleSeed(Role.PM, Scope.PROJECT, "Project manager role"),
                new RoleSeed(Role.LEAD, Scope.PROJECT, "Team lead role within project"),
                new RoleSeed(Role.MEMBER, Scope.PROJECT, "Can view and update assigned tasks"),
                new RoleSeed(Role.VIEWER, Scope.PROJECT, "Read only access in project")
        );
    }

    private List<PermissionSeed> permissionSeeds() {
        return List.of(
                new PermissionSeed("ACTIVITY_VIEW", "ACTIVITY", "View activity log"),
                new PermissionSeed("ROLE_PERMISSION_ASSIGN", "PERMISSION", "Assign permission to role"),
                new PermissionSeed("PERMISSION_DELETE", "PERMISSION", "Delete permission"),
                new PermissionSeed("PERMISSION_UPDATE", "PERMISSION", "Update permission"),
                new PermissionSeed("PERMISSION_VIEW", "PERMISSION", "View permission"),
                new PermissionSeed("PERMISSION_CREATE", "PERMISSION", "Create permission"),
                new PermissionSeed("ROLE_DELETE", "ROLE", "Delete role"),
                new PermissionSeed("ROLE_UPDATE", "ROLE", "Update role"),
                new PermissionSeed("ROLE_VIEW", "ROLE", "View role"),
                new PermissionSeed("ROLE_CREATE", "ROLE", "Create role"),
                new PermissionSeed("TEAM_DELETE", "TEAM", "Delete team"),
                new PermissionSeed("TEAM_UPDATE", "TEAM", "Update team"),
                new PermissionSeed("TEAM_VIEW", "TEAM", "View team"),
                new PermissionSeed("TEAM_CREATE", "TEAM", "Create team"),
                new PermissionSeed("DEPARTMENT_DELETE", "DEPARTMENT", "Delete department"),
                new PermissionSeed("DEPARTMENT_UPDATE", "DEPARTMENT", "Update department"),
                new PermissionSeed("DEPARTMENT_VIEW", "DEPARTMENT", "View department"),
                new PermissionSeed("DEPARTMENT_CREATE", "DEPARTMENT", "Create department"),
                new PermissionSeed("USER_ROLE_ASSIGN", "USER", "Assign system role to user"),
                new PermissionSeed("USER_DELETE", "USER", "Delete user"),
                new PermissionSeed("USER_UPDATE", "USER", "Update user"),
                new PermissionSeed("USER_VIEW", "USER", "View user"),
                new PermissionSeed("USER_CREATE", "USER", "Create user"),
                new PermissionSeed("LABEL_DELETE", "LABEL", "Delete label"),
                new PermissionSeed("LABEL_UPDATE", "LABEL", "Update label"),
                new PermissionSeed("LABEL_VIEW", "LABEL", "View label"),
                new PermissionSeed("LABEL_CREATE", "LABEL", "Create label"),
                new PermissionSeed("PROJECT_MEMBER_MANAGE", "PROJECT", "Manage project members"),
                new PermissionSeed("PROJECT_ARCHIVE", "PROJECT", "Archive project"),
                new PermissionSeed("PROJECT_DELETE", "PROJECT", "Delete project"),
                new PermissionSeed("PROJECT_UPDATE", "PROJECT", "Update project"),
                new PermissionSeed("PROJECT_VIEW", "PROJECT", "View project"),
                new PermissionSeed("PROJECT_CREATE", "PROJECT", "Create project"),
                new PermissionSeed("BOARD_COLUMN_MANAGE", "BOARD", "Manage board columns"),
                new PermissionSeed("BOARD_DELETE", "BOARD", "Delete board"),
                new PermissionSeed("BOARD_VIEW", "BOARD", "View board"),
                new PermissionSeed("BOARD_CREATE", "BOARD", "Create board"),
                new PermissionSeed("ATTACHMENT_DELETE", "ATTACHMENT", "Delete attachment"),
                new PermissionSeed("ATTACHMENT_VIEW", "ATTACHMENT", "View attachment"),
                new PermissionSeed("ATTACHMENT_UPLOAD", "ATTACHMENT", "Upload attachment"),
                new PermissionSeed("COMMENT_DELETE", "COMMENT", "Delete comment"),
                new PermissionSeed("COMMENT_UPDATE", "COMMENT", "Update comment"),
                new PermissionSeed("COMMENT_VIEW", "COMMENT", "View comment"),
                new PermissionSeed("COMMENT_CREATE", "COMMENT", "Create comment"),
                new PermissionSeed("TASK_CHANGE_STATUS", "TASK", "Change task status"),
                new PermissionSeed("TASK_MOVE", "TASK", "Move task across board columns"),
                new PermissionSeed("TASK_ASSIGN", "TASK", "Assign task"),
                new PermissionSeed("TASK_DELETE", "TASK", "Delete task"),
                new PermissionSeed("TASK_UPDATE", "TASK", "Update task"),
                new PermissionSeed("TASK_VIEW", "TASK", "View task"),
                new PermissionSeed("TASK_CREATE", "TASK", "Create task")
        );
    }

    private Map<RoleKey, Set<String>> rolePermissionMatrix() {
        Map<RoleKey, Set<String>> matrix = new HashMap<>();

        matrix.put(new RoleKey(Role.ADMIN, Scope.SYSTEM), set(
                "USER_CREATE", "USER_VIEW", "USER_UPDATE", "USER_DELETE", "USER_ROLE_ASSIGN",
                "DEPARTMENT_CREATE", "DEPARTMENT_VIEW", "DEPARTMENT_UPDATE", "DEPARTMENT_DELETE",
                "TEAM_CREATE", "TEAM_VIEW", "TEAM_UPDATE", "TEAM_DELETE",
                "PROJECT_CREATE", "PROJECT_VIEW", "PROJECT_UPDATE", "PROJECT_DELETE", "PROJECT_ARCHIVE",
                "PROJECT_MEMBER_MANAGE",
                "BOARD_CREATE", "BOARD_VIEW", "BOARD_DELETE", "BOARD_COLUMN_MANAGE",
                "TASK_CREATE", "TASK_VIEW", "TASK_UPDATE", "TASK_DELETE", "TASK_ASSIGN", "TASK_MOVE", "TASK_CHANGE_STATUS",
                "COMMENT_CREATE", "COMMENT_VIEW", "COMMENT_UPDATE", "COMMENT_DELETE",
                "ATTACHMENT_UPLOAD", "ATTACHMENT_VIEW", "ATTACHMENT_DELETE",
                "LABEL_CREATE", "LABEL_VIEW", "LABEL_UPDATE", "LABEL_DELETE",
                "ACTIVITY_VIEW"
        ));

        matrix.put(new RoleKey(Role.MANAGER, Scope.SYSTEM), set(
                "USER_VIEW", "DEPARTMENT_VIEW", "TEAM_VIEW",
                "PROJECT_CREATE", "PROJECT_VIEW", "PROJECT_UPDATE", "PROJECT_ARCHIVE", "PROJECT_MEMBER_MANAGE",
                "BOARD_CREATE", "BOARD_VIEW", "BOARD_COLUMN_MANAGE",
                "TASK_CREATE", "TASK_VIEW", "TASK_UPDATE", "TASK_ASSIGN", "TASK_MOVE", "TASK_CHANGE_STATUS",
                "COMMENT_CREATE", "COMMENT_VIEW", "COMMENT_UPDATE", "COMMENT_DELETE",
                "ATTACHMENT_UPLOAD", "ATTACHMENT_VIEW", "ATTACHMENT_DELETE",
                "LABEL_CREATE", "LABEL_VIEW", "LABEL_UPDATE", "LABEL_DELETE",
                "ACTIVITY_VIEW"
        ));

        matrix.put(new RoleKey(Role.EMPLOYEE, Scope.SYSTEM), set(
                "PROJECT_VIEW", "BOARD_VIEW",
                "TASK_VIEW", "TASK_UPDATE", "TASK_ASSIGN", "TASK_MOVE", "TASK_CHANGE_STATUS",
                "COMMENT_CREATE", "COMMENT_VIEW",
                "ATTACHMENT_UPLOAD", "ATTACHMENT_VIEW",
                "LABEL_VIEW",
                "ACTIVITY_VIEW"
        ));

        matrix.put(new RoleKey(Role.PROJECT_ADMIN, Scope.PROJECT), set(
                "PROJECT_VIEW", "PROJECT_UPDATE", "PROJECT_ARCHIVE", "PROJECT_MEMBER_MANAGE",
                "BOARD_CREATE", "BOARD_VIEW", "BOARD_DELETE", "BOARD_COLUMN_MANAGE",
                "TASK_CREATE", "TASK_VIEW", "TASK_UPDATE", "TASK_DELETE", "TASK_ASSIGN", "TASK_MOVE", "TASK_CHANGE_STATUS",
                "COMMENT_CREATE", "COMMENT_VIEW", "COMMENT_UPDATE", "COMMENT_DELETE",
                "ATTACHMENT_UPLOAD", "ATTACHMENT_VIEW", "ATTACHMENT_DELETE",
                "LABEL_CREATE", "LABEL_VIEW", "LABEL_UPDATE", "LABEL_DELETE",
                "ACTIVITY_VIEW"
        ));

        matrix.put(new RoleKey(Role.PM, Scope.PROJECT), set(
                "PROJECT_VIEW", "PROJECT_UPDATE", "PROJECT_MEMBER_MANAGE",
                "BOARD_CREATE", "BOARD_VIEW", "BOARD_COLUMN_MANAGE",
                "TASK_CREATE", "TASK_VIEW", "TASK_UPDATE", "TASK_ASSIGN", "TASK_MOVE", "TASK_CHANGE_STATUS",
                "COMMENT_CREATE", "COMMENT_VIEW", "COMMENT_UPDATE",
                "ATTACHMENT_UPLOAD", "ATTACHMENT_VIEW",
                "LABEL_CREATE", "LABEL_VIEW", "LABEL_UPDATE",
                "ACTIVITY_VIEW"
        ));

        matrix.put(new RoleKey(Role.LEAD, Scope.PROJECT), set(
                "PROJECT_VIEW", "BOARD_VIEW", "BOARD_COLUMN_MANAGE",
                "TASK_CREATE", "TASK_VIEW", "TASK_UPDATE", "TASK_ASSIGN", "TASK_MOVE", "TASK_CHANGE_STATUS",
                "COMMENT_CREATE", "COMMENT_VIEW", "COMMENT_UPDATE",
                "ATTACHMENT_UPLOAD", "ATTACHMENT_VIEW",
                "LABEL_VIEW", "LABEL_UPDATE",
                "ACTIVITY_VIEW"
        ));

        matrix.put(new RoleKey(Role.MEMBER, Scope.PROJECT), set(
                "PROJECT_VIEW", "BOARD_VIEW",
                "TASK_CREATE", "TASK_VIEW", "TASK_UPDATE", "TASK_ASSIGN", "TASK_MOVE", "TASK_CHANGE_STATUS",
                "COMMENT_CREATE", "COMMENT_VIEW", "COMMENT_UPDATE",
                "ATTACHMENT_UPLOAD", "ATTACHMENT_VIEW",
                "LABEL_VIEW",
                "ACTIVITY_VIEW"
        ));

        matrix.put(new RoleKey(Role.VIEWER, Scope.PROJECT), set(
                "PROJECT_VIEW", "BOARD_VIEW", "TASK_VIEW", "COMMENT_VIEW", "ATTACHMENT_VIEW", "LABEL_VIEW", "ACTIVITY_VIEW"
        ));

        return matrix;
    }

    private Set<String> set(String... values) {
        return Set.of(values);
    }

    private void seedAiTestingData(Map<RoleKey, RoleEntity> rolesByKey) {
    log.info("Seeding AI testing data (Users with Teams & Sample Project)...");

    // 1. Tạo Project mẫu
    ProjectEntity project = projectRepository.findByNameAndDeletedFalse("Fluxboard AI System")
            .stream().findFirst()
            .orElseGet(() -> {
                ProjectEntity p = new ProjectEntity();
                p.setName("Fluxboard AI System");
                p.setStatus("ACTIVE");
                p.setDepartmentId("IT-DEPT");
                return projectRepository.save(p);
            });

    // 2. Tạo danh sách User kèm theo Team chuyên môn (TeamId rất quan trọng cho AI)
    User manh = createAiUser("Châu Đức Mạnh", "manh@fluxboard.com", "Backend-Team", rolesByKey);
    User quang = createAiUser("Bùi Trương Nhật Quang", "quang@fluxboard.com", "Frontend-Team", rolesByKey);
    User longUser = createAiUser("Hán Dương Long", "long@fluxboard.com", "QC-Team", rolesByKey);

    // 3. Gán họ vào Project Member với Role là MEMBER (Scope PROJECT)
    RoleEntity projectMemberRole = rolesByKey.get(new RoleKey(Role.MEMBER, Scope.PROJECT));
    if (projectMemberRole != null) {
        assignProjectMember(project.getId(), manh.getId(), projectMemberRole.getId());
        assignProjectMember(project.getId(), quang.getId(), projectMemberRole.getId());
        assignProjectMember(project.getId(), longUser.getId(), projectMemberRole.getId());
    }
    
    log.info("AI testing data seeded successfully for Project: {}", project.getName());
}

private User createAiUser(String name, String email, String team, Map<RoleKey, RoleEntity> rolesByKey) {
    return userRepository.findByEmail(email).orElseGet(() -> {
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode("123456"));
        u.setTeamId(team); // AI Service sẽ dựa vào đây để gán việc
        u.setDepartmentId("IT-DEPT");
        
        // Gán Role mặc định là EMPLOYEE (Scope SYSTEM)
        RoleEntity employeeRole = rolesByKey.get(new RoleKey(Role.EMPLOYEE, Scope.SYSTEM));
        if (employeeRole != null) u.setRoleId(employeeRole.getId());
        
        return userRepository.save(u);
    });
}

private void assignProjectMember(String projectId, String userId, String roleId) {
    if (!projectMemberRepository.existsByProjectIdAndUserIdAndIsActiveTrue(projectId, userId)) {
        ProjectMember pm = new ProjectMember();
        pm.setProjectId(projectId);
        pm.setUserId(userId);
        pm.setRoleIds(List.of(roleId));
        pm.setActive(true);
        projectMemberRepository.save(pm);
    }
}

    private record RoleSeed(Role name, Scope scope, String description) {
    }

    private record PermissionSeed(String code, String module, String description) {
    }

    private record RoleKey(Role name, Scope scope) {
    }
}

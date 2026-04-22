package com.fluxboard.metric.service;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.repository.ActivityRepository;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.organization.service.OrganizationService;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.repository.RoleRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class MetricService {

        private final UserRepository userRepository;
        private final ProjectRepository projectRepository;
        private final RoleRepository roleRepository;
        private final ActivityRepository activityRepository;
        private final OrganizationService organizationService;

        public MetricService(
                        UserRepository userRepository,
                        ProjectRepository projectRepository,
                        RoleRepository roleRepository,
                        ActivityRepository activityRepository,
                        OrganizationService organizationService) {
                this.userRepository = userRepository;
                this.projectRepository = projectRepository;
                this.roleRepository = roleRepository;
                this.activityRepository = activityRepository;
                this.organizationService = organizationService;
        }

        public Map<String, Object> getDashboardMetrics(AuthenticatedUser authUser) {
                if (authUser == null || authUser.roleId() == null || authUser.roleId().isBlank()) {
                        throw new AppException(ErrorCode.UNAUTHORIZED, "Authenticated role is required.");
                }

                RoleEntity roleEntity = roleRepository.findById(authUser.roleId())
                                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Role is not valid."));
                Role role = roleEntity.getName();

                if (role == null) {
                        throw new AppException(ErrorCode.FORBIDDEN, "Role is not valid.");
                }

                return switch (role) {
                        case SYSTEM_ADMIN, ADMIN -> buildSystemAdminMetrics();
                        case MANAGER -> Map.of(
                                        "role", role.name(),
                                        "metrics", buildManagerMetrics());
                        case LEAD -> Map.of(
                                        "role", role.name(),
                                        "metrics", buildLeadMetrics());
                        case MEMBER -> Map.of(
                                        "role", role.name(),
                                        "metrics", buildMemberMetrics());
                        default -> throw new AppException(ErrorCode.FORBIDDEN,
                                        "This role cannot access dashboard metrics.");
                };
        }

        private Map<String, Object> buildSystemAdminMetrics() {
                return Map.of(
                                "cards", buildSystemCards(),
                                "project_status_distribution", buildProjectStatusDistribution(),
                                "audit_logs", buildAuditLogs());
        }

        private Map<String, Object> buildManagerMetrics() {
                return Map.of(
                                "cards", buildSystemCards(),
                                "weekly_progress", List.of(
                                                Map.of("week", "W14", "fluxboard", 20, "potpan", 15),
                                                Map.of("week", "W15", "fluxboard", 45, "potpan", 35),
                                                Map.of("week", "W16", "fluxboard", 70, "potpan", 55),
                                                Map.of("week", "W17", "fluxboard", 95, "potpan", 80)),
                                "task_completion_by_team", List.of(
                                                Map.of("team", "Frontend", "percentage", 85),
                                                Map.of("team", "Backend", "percentage", 70),
                                                Map.of("team", "Design", "percentage", 92)),
                                "ai_vs_actual_points", List.of(
                                                Map.of("task_id", "T-101", "ai_point", 8, "actual_point", 5),
                                                Map.of("task_id", "T-102", "ai_point", 13, "actual_point", 13),
                                                Map.of("task_id", "T-103", "ai_point", 15, "actual_point", 21),
                                                Map.of("task_id", "T-104", "ai_point", 5, "actual_point", 8)));
        }

        private Map<String, Object> buildLeadMetrics() {
                return Map.of(
                                "team_workload", List.of(
                                                Map.of("user_id", "U01", "name", "Bui Anh Khoi", "total_points", 65),
                                                Map.of("user_id", "U02", "name", "Nguyen Van Manh", "total_points", 95),
                                                Map.of("user_id", "U03", "name", "Le Hong Quang", "total_points", 40)),
                                "at_risk_tasks", List.of(
                                                Map.of(
                                                                "id", "T-202",
                                                                "title", "Fix bug Realtime",
                                                                "due_date", "2026-04-18",
                                                                "priority", "CRITICAL",
                                                                "reason", "OVERDUE"),
                                                Map.of(
                                                                "id", "T-205",
                                                                "title", "Deploy K8s",
                                                                "due_date", "2026-04-20",
                                                                "priority", "HIGH",
                                                                "reason", "STUCK")),
                                "recent_activities", List.of(
                                                Map.of("user", "Manh", "content", "Completed Dashboard API", "time",
                                                                "5 minutes ago"),
                                                Map.of("user", "Quang", "content", "Blocked on drag and drop UI",
                                                                "time", "20 minutes ago")));
        }

        private Map<String, Object> buildMemberMetrics() {
                return Map.of(
                                "my_contribution", Map.of("completed", 79, "total", 100),
                                "my_focus", List.of(
                                                Map.of(
                                                                "id", "T-301",
                                                                "title", "Write Auth unit tests",
                                                                "priority", "HIGH",
                                                                "due_date", "Today"),
                                                Map.of(
                                                                "id", "T-302",
                                                                "title", "Update documentation",
                                                                "priority", "MEDIUM",
                                                                "due_date", "Tomorrow")));
        }

        private Map<String, Object> buildSystemCards() {
                var organizationMetrics = organizationService.getMetrics();
                return Map.of(
                                "total_users", userRepository.countByDeletedFalse(),
                                "total_projects", projectRepository.countByDeletedFalse(),
                                "total_departments", organizationMetrics.totalDepartments(),
                                "total_teams", organizationMetrics.totalTeams());
        }

        private List<Map<String, Object>> buildProjectStatusDistribution() {
                List<ProjectEntity> projects = projectRepository.findByDeletedFalse();
                if (projects.isEmpty()) {
                        return List.of();
                }

                Map<String, Long> countByStatus = new LinkedHashMap<>();
                for (ProjectEntity project : projects) {
                        String status = normalizeStatus(project.getStatus());
                        countByStatus.put(status, countByStatus.getOrDefault(status, 0L) + 1L);
                }

                List<Map<String, Object>> result = new ArrayList<>();
                for (Map.Entry<String, Long> entry : countByStatus.entrySet()) {
                        result.add(Map.of(
                                        "status", entry.getKey(),
                                        "count", entry.getValue(),
                                        "color", resolveStatusColor(entry.getKey())));
                }

                return result;
        }

        private List<Map<String, Object>> buildAuditLogs() {
                List<ActivityEntity> activities = activityRepository
                                .findByDeletedFalse(PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")))
                                .getContent();
                if (activities.isEmpty()) {
                        return List.of();
                }

                Set<String> actorIds = new LinkedHashSet<>();
                for (ActivityEntity activity : activities) {
                        String actorId = TextUtils.trimToNull(activity.getActorUserId());
                        if (actorId != null) {
                                actorIds.add(actorId);
                        }
                }

                Map<String, String> actorNames = new LinkedHashMap<>();
                if (!actorIds.isEmpty()) {
                        List<User> users = userRepository.findByIdInAndDeletedFalse(new ArrayList<>(actorIds));
                        for (User user : users) {
                                String fullName = TextUtils.trimToNull(user.getFullName());
                                actorNames.put(user.getId(),
                                                fullName == null ? "User(" + shortId(user.getId()) + ")" : fullName);
                        }
                }

                List<Map<String, Object>> result = new ArrayList<>();
                for (ActivityEntity activity : activities) {
                        String actorId = TextUtils.trimToNull(activity.getActorUserId());
                        String actorName = actorId == null ? "System"
                                        : actorNames.getOrDefault(actorId, "User(" + shortId(actorId) + ")");

                        String source = activity.getSourceType() == null ? "SYSTEM" : activity.getSourceType().name();
                        String action = activity.getAction() == null ? "UNKNOWN" : activity.getAction().name();
                        String target = TextUtils.trimToNull(activity.getMessage());
                        if (target == null) {
                                String sourceId = TextUtils.trimToNull(activity.getSourceId());
                                target = sourceId == null ? source : source + ":" + sourceId;
                        }

                        result.add(Map.of(
                                        "id", activity.getId(),
                                        "actor_name", actorName,
                                        "action", source + "_" + action,
                                        "target", target,
                                        "created_at", resolveCreatedAt(activity.getCreatedAt()),
                                        "severity", resolveSeverity(activity.getAction())));
                }

                return result;
        }

        private String normalizeStatus(String status) {
                String normalized = TextUtils.trimToNull(status);
                return normalized == null ? "UNKNOWN" : normalized.toUpperCase();
        }

        private String resolveStatusColor(String status) {
                return switch (status) {
                        case "ON_TRACK", "ACTIVE" -> "#10b981";
                        case "AT_RISK", "IN_PROGRESS" -> "#f59e0b";
                        case "DELAYED", "BLOCKED" -> "#ef4444";
                        case "DONE", "COMPLETED" -> "#3b82f6";
                        default -> "#6b7280";
                };
        }

        private String resolveSeverity(ActivityAction action) {
                if (action == null) {
                        return "INFO";
                }

                return switch (action) {
                        case DELETE -> "CRITICAL";
                        case UPDATE, MOVE -> "WARNING";
                        case CREATE, ADD_MEMBER -> "INFO";
                };
        }

        private Instant resolveCreatedAt(Instant createdAt) {
                return createdAt == null ? Instant.now() : createdAt;
        }

        private String shortId(String value) {
                if (value == null || value.isBlank()) {
                        return "unknown";
                }
                return value.length() <= 6 ? value : value.substring(0, 6);
        }
}

package com.fluxboard.dashboard.service;

import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MongoTemplate mongoTemplate;
    private final RoleRepository roleRepository;

    /**
     * Entry point: Phân quyền và điều hướng dữ liệu Dashboard
     */
    public Object getDashboardMetrics(String timeRange, String departmentId, String teamId, AuthenticatedUser currentUser) {
        RoleEntity roleEntity = roleRepository.findById(currentUser.roleId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy quyền hạn người dùng."));
        
        String roleName = roleEntity.getName().name().toUpperCase();

        if (roleName.contains("ADMIN")) {
            return getAdminMetrics(timeRange, departmentId);
        } else if (roleName.contains("MANAGER") || roleName.contains("LEAD")) {
            return getManagerMetrics(timeRange, teamId);
        } else {
            return getMemberMetrics(currentUser.userId());
        }
    }

    /**
     * ADMIN: Nhìn tổng quan toàn bộ tổ chức
     */
    @SuppressWarnings("rawtypes")
    private Map<String, Object> getAdminMetrics(String timeRange, String departmentId) {
        Map<String, Object> result = new HashMap<>();

        // 1. Organization KPI
        long totalUsers = mongoTemplate.count(new Query(Criteria.where("is_deleted").is(false)), "users");
        long totalDepartments = mongoTemplate.count(new Query(Criteria.where("is_deleted").is(false)), "departments");
        long totalTeams = mongoTemplate.count(new Query(Criteria.where("is_deleted").is(false)), "teams");
        result.put("organization_kpi", Map.of(
                "total_users", totalUsers,
                "total_departments", totalDepartments,
                "total_teams", totalTeams
        ));

        // 2. Company Deadline Health
        Aggregation healthAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false)),
                Aggregation.group()
                        .sum(ConditionalOperators.when(Criteria.where("status").is("ON_TRACK")).then(1).otherwise(0)).as("on_track")
                        .sum(ConditionalOperators.when(Criteria.where("status").is("AT_RISK")).then(1).otherwise(0)).as("at_risk")
                        .sum(ConditionalOperators.when(Criteria.where("status").in("OVERDUE", "LATE")).then(1).otherwise(0)).as("overdue")
                        .sum("extension_count").as("total_extensions")
        );
        AggregationResults<Map> healthResults = mongoTemplate.aggregate(healthAgg, "task_deadlines", Map.class);
        Map<String, Object> healthMap = healthResults.getUniqueMappedResult() != null 
                ? new HashMap<>(healthResults.getUniqueMappedResult()) 
                : new HashMap<>(Map.of("on_track", 0, "at_risk", 0, "overdue", 0, "total_extensions", 0));
        healthMap.remove("_id");
        result.put("company_deadline_health", healthMap);

        // 3. Department Points Distribution
        Aggregation deptPointsAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false).and("story_point").ne(null)),
                Aggregation.unwind("assignees_user_id"),
                Aggregation.lookup("users", "assignees_user_id", "_id", "user_info"),
                Aggregation.unwind("user_info"),
                Aggregation.lookup("departments", "user_info.department_id", "_id", "dept_info"),
                Aggregation.unwind("dept_info", true),
                Aggregation.project("story_point", "status", "dept_info._id"),
                Aggregation.group("dept_info._id")
                        .sum("story_point").as("total_points")
                        .sum(ConditionalOperators.when(Criteria.where("status").is("DONE")).thenValueOf("story_point").otherwise(0)).as("completed_points")
        );
        AggregationResults<Map> deptPointsResults = mongoTemplate.aggregate(deptPointsAgg, "tasks", Map.class);
        List<Map<String, Object>> deptPoints = deptPointsResults.getMappedResults().stream().map(doc -> {
            Map<String, Object> map = new HashMap<>();
            map.put("department_id", doc.get("_id") != null ? doc.get("_id").toString() : "Unassigned");
            map.put("total_points", ((Number) doc.getOrDefault("total_points", 0)).longValue());
            map.put("completed_points", ((Number) doc.getOrDefault("completed_points", 0)).longValue());
            map.put("overdue_tasks", 0); 
            return map;
        }).collect(Collectors.toList());
        result.put("department_points_distribution", deptPoints);

        return result;
    }

    /**
     * MANAGER/LEAD: Quản lý khối lượng công việc và rủi ro team
     */
    @SuppressWarnings({"rawtypes", "unchecked"})
    private Map<String, Object> getManagerMetrics(String timeRange, String teamId) {
        Map<String, Object> result = new HashMap<>();

        // 1. Team Workload Capacity (Xử lý match động)
        List<AggregationOperation> workloadOps = new ArrayList<>();
        workloadOps.add(Aggregation.match(Criteria.where("is_deleted").is(false).and("status").ne("DONE").and("story_point").ne(null)));
        workloadOps.add(Aggregation.unwind("assignees_user_id"));
        workloadOps.add(Aggregation.lookup("users", "assignees_user_id", "_id", "user_details"));
        workloadOps.add(Aggregation.unwind("user_details"));
        if (teamId != null && !teamId.isEmpty()) {
            workloadOps.add(Aggregation.match(Criteria.where("user_details.team_id").is(teamId)));
        }
        workloadOps.add(Aggregation.project("assignees_user_id", "story_point", "user_details.full_name"));
        workloadOps.add(Aggregation.group("assignees_user_id")
                .first("full_name").as("full_name")
                .sum("story_point").as("current_points"));

        Aggregation workloadAgg = Aggregation.newAggregation(workloadOps);
        AggregationResults<Map> workloadResults = mongoTemplate.aggregate(workloadAgg, "tasks", Map.class);
        List<Map<String, Object>> teamWorkload = workloadResults.getMappedResults().stream().map(doc -> {
            long points = ((Number) doc.getOrDefault("current_points", 0)).longValue();
            Map<String, Object> map = new HashMap<>();
            map.put("user_id", doc.get("_id") != null ? doc.get("_id").toString() : "Unknown");
            map.put("full_name", doc.get("full_name"));
            map.put("current_points", points);
            map.put("status", points > 20 ? "OVERLOADED" : "AVAILABLE");
            return map;
        }).collect(Collectors.toList());
        result.put("team_workload_capacity", teamWorkload);

        // 2. At Risk Tasks (Tối ưu: Limit trước Lookup sau)
        Aggregation atRiskAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false).and("status").in("AT_RISK", "OVERDUE", "LATE")),
                Aggregation.limit(10), 
                Aggregation.lookup("tasks", "task_id", "_id", "task_info"),
                Aggregation.unwind("task_info", true),
                Aggregation.project("task_id", "due_date", "status", "extension_count", "task_info.title", "task_info.story_point", "task_info.priority")
        );
        AggregationResults<Map> atRiskResults = mongoTemplate.aggregate(atRiskAgg, "task_deadlines", Map.class);
        List<Map<String, Object>> atRiskTasks = atRiskResults.getMappedResults().stream().map(doc -> {
            Map<String, Object> map = new HashMap<>();
            map.put("task_id", doc.get("task_id"));
            map.put("title", doc.get("title") != null ? doc.get("title") : "Unknown");
            map.put("story_point", doc.get("story_point") != null ? ((Number) doc.get("story_point")).intValue() : 0);
            map.put("priority", doc.get("priority") != null ? doc.get("priority") : "NORMAL");
            map.put("due_date", doc.get("due_date"));
            map.put("deadline_status", doc.get("status"));
            map.put("extension_count", ((Number) doc.getOrDefault("extension_count", 0)).intValue());
            return map;
        }).collect(Collectors.toList());
        result.put("at_risk_tasks", atRiskTasks);

        // 3. AI Efficiency (Lấy 10 task gần nhất)
        Aggregation aiAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false).and("ai_suggested_point").ne(null).and("story_point").ne(null)),
                Aggregation.project("title", "ai_suggested_point", "story_point", "created_at"),
                Aggregation.sort(Sort.Direction.DESC, "created_at"),
                Aggregation.limit(10)
        );
        AggregationResults<Map> aiResults = mongoTemplate.aggregate(aiAgg, "tasks", Map.class);
        List<Map<String, Object>> aiEfficiency = aiResults.getMappedResults().stream().map(doc -> {
            Map<String, Object> map = new HashMap<>();
            map.put("task_title", doc.get("title"));
            map.put("ai_suggested_point", doc.get("ai_suggested_point"));
            map.put("actual_point", doc.get("story_point"));
            return map;
        }).collect(Collectors.toList());
        result.put("ai_efficiency", aiEfficiency);

        return result;
    }

    /**
     * MEMBER: Cá nhân tập trung vào task được giao
     */
    @SuppressWarnings({"rawtypes", "unchecked"})
    private Map<String, Object> getMemberMetrics(String userId) {
        Map<String, Object> result = new HashMap<>();

        // 1. Contribution
        Aggregation contribAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false).and("assignees_user_id").is(userId)),
                Aggregation.group()
                        .count().as("total_assigned")
                        .sum(ConditionalOperators.when(Criteria.where("status").is("DONE")).then(1).otherwise(0)).as("completed_tasks")
        );
        AggregationResults<Map> contribResults = mongoTemplate.aggregate(contribAgg, "tasks", Map.class);
        Map<String, Object> contribMap = contribResults.getUniqueMappedResult() != null 
                ? new HashMap<>(contribResults.getUniqueMappedResult()) 
                : new HashMap<>(Map.of("completed_tasks", 0, "total_assigned", 0));
        contribMap.remove("_id");
        result.put("my_contribution", contribMap);

        // 2. Focus Board (Task ưu tiên cao sắp cháy hạn)
        Aggregation focusAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false)
                        .and("assignees_user_id").is(userId)
                        .and("status").ne("DONE")
                        .and("priority").in("HIGH", "CRITICAL")),
                Aggregation.lookup("task_deadlines", "_id", "task_id", "deadline_info"),
                Aggregation.unwind("deadline_info", true),
                Aggregation.project("title", "priority", "story_point", "deadline_info.due_date", "deadline_info.status", "deadline_info.extension_count"),
                Aggregation.sort(Sort.Direction.ASC, "deadline_info.due_date"),
                Aggregation.limit(5)
        );
        AggregationResults<Map> focusResults = mongoTemplate.aggregate(focusAgg, "tasks", Map.class);
        List<Map<String, Object>> focusTasks = focusResults.getMappedResults().stream().map(doc -> {
            Map<String, Object> deadlineInfo = (Map<String, Object>) doc.get("deadline_info");
            Map<String, Object> map = new HashMap<>();
            map.put("task_id", doc.get("_id") != null ? doc.get("_id").toString() : "Unknown");
            map.put("title", doc.get("title"));
            map.put("priority", doc.get("priority"));
            map.put("story_point", ((Number) doc.getOrDefault("story_point", 0)).intValue());
            map.put("due_date", deadlineInfo != null ? deadlineInfo.get("due_date") : null);
            map.put("deadline_status", deadlineInfo != null ? deadlineInfo.get("status") : "ON_TRACK");
            map.put("extensions_used", deadlineInfo != null ? ((Number) deadlineInfo.getOrDefault("extension_count", 0)).intValue() : 0);
            return map;
        }).collect(Collectors.toList());
        result.put("my_focus_board", focusTasks);

        return result;
    }
}
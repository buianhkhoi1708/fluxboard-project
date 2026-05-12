package com.fluxboard.dashboard.repository;

import com.fluxboard.dashboard.dto.response.AdminMetricsResponse;
import com.fluxboard.dashboard.dto.response.ManagerMetricsResponse;
import com.fluxboard.dashboard.dto.response.MemberMetricsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class DashboardRepositoryImpl implements DashboardRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    @Override
    public AdminMetricsResponse getAdminMetrics(String timeRange, String departmentId) {
        
        // 1. Organization KPI
        long totalUsers = mongoTemplate.count(new org.springframework.data.mongodb.core.query.Query(Criteria.where("is_deleted").is(false)), "users");
        long totalDepartments = mongoTemplate.count(new org.springframework.data.mongodb.core.query.Query(Criteria.where("is_deleted").is(false)), "departments");
        long totalTeams = mongoTemplate.count(new org.springframework.data.mongodb.core.query.Query(Criteria.where("is_deleted").is(false)), "teams");
        AdminMetricsResponse.OrganizationKpi kpi = new AdminMetricsResponse.OrganizationKpi(totalUsers, totalDepartments, totalTeams);

        // 2. Company Deadline Health
        Aggregation healthAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false)),
                Aggregation.group()
                        .sum(org.springframework.data.mongodb.core.aggregation.ConditionalOperators.when(Criteria.where("status").is("ON_TRACK")).then(1).otherwise(0)).as("onTrack")
                        .sum(org.springframework.data.mongodb.core.aggregation.ConditionalOperators.when(Criteria.where("status").is("AT_RISK")).then(1).otherwise(0)).as("atRisk")
                        .sum(org.springframework.data.mongodb.core.aggregation.ConditionalOperators.when(Criteria.where("status").in("OVERDUE", "LATE")).then(1).otherwise(0)).as("overdue")
                        .sum("extension_count").as("totalExtensions")
        );
        AggregationResults<Map> healthResults = mongoTemplate.aggregate(healthAgg, "task_deadlines", Map.class);
        AdminMetricsResponse.CompanyDeadlineHealth health = new AdminMetricsResponse.CompanyDeadlineHealth(0, 0, 0, 0);
        if (healthResults.getUniqueMappedResult() != null) {
            Map<String, Object> res = healthResults.getUniqueMappedResult();
            health = new AdminMetricsResponse.CompanyDeadlineHealth(
                    ((Number) res.getOrDefault("onTrack", 0)).longValue(),
                    ((Number) res.getOrDefault("atRisk", 0)).longValue(),
                    ((Number) res.getOrDefault("overdue", 0)).longValue(),
                    ((Number) res.getOrDefault("totalExtensions", 0)).longValue()
            );
        }

        // 3. Department Points Distribution
        Aggregation deptPointsAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false).and("story_point").ne(null)),
                Aggregation.unwind("assignees_user_id"),
                Aggregation.lookup("users", "assignees_user_id", "_id", "user_info"),
                Aggregation.unwind("user_info"),
                Aggregation.lookup("departments", "user_info.department_id", "_id", "dept_info"),
                Aggregation.unwind("dept_info", true),
                Aggregation.group("dept_info._id")
                        .sum("story_point").as("totalPoints")
                        .sum(org.springframework.data.mongodb.core.aggregation.ConditionalOperators.when(Criteria.where("status").is("DONE")).thenValueOf("story_point").otherwise(0)).as("completedPoints")
        );
        
        AggregationResults<Map> deptPointsResults = mongoTemplate.aggregate(deptPointsAgg, "tasks", Map.class);
        List<AdminMetricsResponse.DepartmentPoint> deptPoints = deptPointsResults.getMappedResults().stream()
                .map(doc -> new AdminMetricsResponse.DepartmentPoint(
                        doc.get("_id") != null ? doc.get("_id").toString() : "Unassigned",
                        ((Number) doc.getOrDefault("totalPoints", 0)).longValue(),
                        ((Number) doc.getOrDefault("completedPoints", 0)).longValue(),
                        0
                )).toList();

        return new AdminMetricsResponse(kpi, health, deptPoints);
    }

    @Override
    public ManagerMetricsResponse getManagerMetrics(String timeRange, String teamId) {
        // 1. Team Workload Capacity
        Aggregation workloadAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false).and("status").ne("DONE").and("story_point").ne(null)),
                Aggregation.unwind("assignees_user_id"),
                Aggregation.lookup("users", "assignees_user_id", "_id", "user_details"),
                Aggregation.unwind("user_details"),
                Aggregation.match(teamId != null && !teamId.isEmpty() ? Criteria.where("user_details.team_id").is(teamId) : new Criteria()),
                Aggregation.group("assignees_user_id")
                        .first("user_details.full_name").as("fullName")
                        .sum("story_point").as("currentPoints")
        );
        AggregationResults<Map> workloadResults = mongoTemplate.aggregate(workloadAgg, "tasks", Map.class);
        List<ManagerMetricsResponse.TeamWorkload> teamWorkload = workloadResults.getMappedResults().stream()
                .map(doc -> {
                    long points = ((Number) doc.getOrDefault("currentPoints", 0)).longValue();
                    String status = points > 20 ? "OVERLOADED" : "AVAILABLE";
                    return new ManagerMetricsResponse.TeamWorkload(
                            doc.get("_id").toString(),
                            (String) doc.get("fullName"),
                            points,
                            status
                    );
                }).toList();

        // 2. At Risk Tasks
        Aggregation atRiskAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false).and("status").in("AT_RISK", "OVERDUE", "LATE")),
                Aggregation.lookup("tasks", "task_id", "_id", "task_info"),
                Aggregation.unwind("task_info"),
                Aggregation.limit(10)
        );
        AggregationResults<Map> atRiskResults = mongoTemplate.aggregate(atRiskAgg, "task_deadlines", Map.class);
        List<ManagerMetricsResponse.AtRiskTask> atRiskTasks = atRiskResults.getMappedResults().stream()
                .map(doc -> {
                    Map<String, Object> taskInfo = (Map<String, Object>) doc.get("task_info");
                    return new ManagerMetricsResponse.AtRiskTask(
                            (String) doc.get("task_id"),
                            taskInfo != null ? (String) taskInfo.get("title") : "Unknown",
                            taskInfo != null && taskInfo.get("story_point") != null ? ((Number) taskInfo.get("story_point")).intValue() : 0,
                            taskInfo != null ? (String) taskInfo.get("priority") : "NORMAL",
                            (java.time.Instant) doc.get("due_date"),
                            (String) doc.get("status"),
                            ((Number) doc.getOrDefault("extension_count", 0)).intValue()
                    );
                }).toList();

        // 3. AI vs Actual
        Aggregation aiAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false)
                        .and("ai_suggested_point").ne(null)
                        .and("story_point").ne(null)),
                Aggregation.sort(Sort.Direction.DESC, "created_at"),
                Aggregation.limit(10)
        );
        AggregationResults<Map> aiResults = mongoTemplate.aggregate(aiAgg, "tasks", Map.class);
        List<ManagerMetricsResponse.AiEfficiency> aiEfficiency = aiResults.getMappedResults().stream()
                .map(doc -> new ManagerMetricsResponse.AiEfficiency(
                        (String) doc.get("title"),
                        ((Number) doc.get("ai_suggested_point")).intValue(),
                        ((Number) doc.get("story_point")).intValue()
                )).toList();

        return new ManagerMetricsResponse(teamWorkload, atRiskTasks, aiEfficiency);
    }

    @Override
    public MemberMetricsResponse getMemberMetrics(String userId) {
        // 1. My Contribution
        Aggregation contribAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false).and("assignees_user_id").is(userId)),
                Aggregation.group()
                        .count().as("totalAssigned")
                        .sum(org.springframework.data.mongodb.core.aggregation.ConditionalOperators.when(Criteria.where("status").is("DONE")).then(1).otherwise(0)).as("completedTasks")
        );
        AggregationResults<Map> contribResults = mongoTemplate.aggregate(contribAgg, "tasks", Map.class);
        MemberMetricsResponse.MyContribution contribution = new MemberMetricsResponse.MyContribution(0, 0);
        if (contribResults.getUniqueMappedResult() != null) {
            Map<String, Object> res = contribResults.getUniqueMappedResult();
            contribution = new MemberMetricsResponse.MyContribution(
                    ((Number) res.getOrDefault("completedTasks", 0)).longValue(),
                    ((Number) res.getOrDefault("totalAssigned", 0)).longValue()
            );
        }

        // 2. My Focus Board
        Aggregation focusAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").is(false)
                        .and("assignees_user_id").is(userId)
                        .and("status").ne("DONE")
                        .and("priority").in("HIGH", "CRITICAL")),
                Aggregation.lookup("task_deadlines", "_id", "task_id", "deadline_info"),
                Aggregation.unwind("deadline_info", true),
                Aggregation.sort(Sort.Direction.ASC, "deadline_info.due_date"),
                Aggregation.limit(5)
        );
        AggregationResults<Map> focusResults = mongoTemplate.aggregate(focusAgg, "tasks", Map.class);
        List<MemberMetricsResponse.FocusTask> focusTasks = focusResults.getMappedResults().stream()
                .map(doc -> {
                    Map<String, Object> deadlineInfo = (Map<String, Object>) doc.get("deadline_info");
                    return new MemberMetricsResponse.FocusTask(
                            doc.get("_id").toString(),
                            (String) doc.get("title"),
                            (String) doc.get("priority"),
                            ((Number) doc.getOrDefault("story_point", 0)).intValue(),
                            deadlineInfo != null ? (java.time.Instant) deadlineInfo.get("due_date") : null,
                            deadlineInfo != null ? (String) deadlineInfo.get("status") : "ON_TRACK",
                            deadlineInfo != null ? ((Number) deadlineInfo.getOrDefault("extension_count", 0)).intValue() : 0
                    );
                }).toList();

        return new MemberMetricsResponse(contribution, focusTasks);
    }
}
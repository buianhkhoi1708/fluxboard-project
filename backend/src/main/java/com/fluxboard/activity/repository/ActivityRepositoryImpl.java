package com.fluxboard.activity.repository;

import com.fluxboard.activity.dto.request.ActivityFilterRequest;
import com.fluxboard.activity.entity.ActivityEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class ActivityRepositoryImpl implements ActivityRepositoryCustom {
    private final MongoTemplate mongoTemplate;

    public ActivityRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Page<ActivityEntity> findByFilter(ActivityFilterRequest filter, Pageable pageable) {
        Query query = new Query(buildCriteria(filter)).with(pageable);
        List<ActivityEntity> content = mongoTemplate.find(query, ActivityEntity.class);
        Query countQuery = Query.of(query).limit(-1).skip(-1);
        return PageableExecutionUtils.getPage(content, pageable, () -> mongoTemplate.count(countQuery, ActivityEntity.class));
    }

   private Criteria buildCriteria(ActivityFilterRequest filter) {
        List<Criteria> and = new ArrayList<>();
        and.add(Criteria.where("is_deleted").is(false));

        if (filter != null) {
            if (filter.activityType() != null) and.add(Criteria.where("activity_type").is(filter.activityType()));
            if (filter.sourceTypes() != null && !filter.sourceTypes().isEmpty()) and.add(Criteria.where("source_type").in(filter.sourceTypes()));
            if (filter.actions() != null && !filter.actions().isEmpty()) and.add(Criteria.where("action").in(filter.actions()));
            if (filter.actorUserIds() != null && !filter.actorUserIds().isEmpty()) and.add(Criteria.where("actor_user_id").in(filter.actorUserIds()));
            if (filter.targetUserIds() != null && !filter.targetUserIds().isEmpty()) and.add(Criteria.where("target_user_id").in(filter.targetUserIds()));
            if (filter.sourceId() != null) and.add(Criteria.where("source_id").is(filter.sourceId()));
            if (filter.projectId() != null) and.add(Criteria.where("project_id").is(filter.projectId()));
            
            // 🚀 BỔ SUNG: Nếu có truyền 1 danh sách Project ID thì quét lệnh $in
            if (filter.projectIds() != null && !filter.projectIds().isEmpty()) {
                and.add(Criteria.where("project_id").in(filter.projectIds()));
            }
            
            if (filter.boardId() != null) and.add(Criteria.where("board_id").is(filter.boardId()));
            if (filter.taskId() != null) and.add(Criteria.where("task_id").is(filter.taskId()));

            Criteria createdAt = buildCreatedAtCriteria(filter.from(), filter.to());
            if (createdAt != null) and.add(createdAt);
        }

        return and.size() == 1 ? and.get(0) : new Criteria().andOperator(and.toArray(Criteria[]::new));
    }

    private Criteria buildCreatedAtCriteria(Instant from, Instant to) {
        if (from == null && to == null) return null;
        Criteria c = Criteria.where("created_at");
        if (from != null) c = c.gte(from);
        if (to != null) c = c.lte(to);
        return c;
    }
}
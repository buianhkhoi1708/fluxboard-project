package com.fluxboard.activity.repository;

import com.fluxboard.activity.dto.request.ActivityFilterRequest;
import com.fluxboard.activity.entity.ActivityEntity;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

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
        return PageableExecutionUtils.getPage(
                content,
                pageable,
                () -> mongoTemplate.count(countQuery, ActivityEntity.class));
    }

    private Criteria buildCriteria(ActivityFilterRequest filter) {
        List<Criteria> andCriteria = new ArrayList<>();
        andCriteria.add(Criteria.where("is_deleted").is(false));

        if (filter != null) {
            if (filter.sourceTypes() != null && !filter.sourceTypes().isEmpty()) {
                andCriteria.add(Criteria.where("source_type").in(filter.sourceTypes()));
            }

            if (filter.actions() != null && !filter.actions().isEmpty()) {
                andCriteria.add(Criteria.where("action").in(filter.actions()));
            }

            if (filter.actorUserIds() != null && !filter.actorUserIds().isEmpty()) {
                andCriteria.add(Criteria.where("actor_user_id").in(filter.actorUserIds()));
            }

            if (filter.sourceId() != null) {
                andCriteria.add(Criteria.where("source_id").is(filter.sourceId()));
            }

            if (filter.projectId() != null) {
                andCriteria.add(Criteria.where("project_id").is(filter.projectId()));
            }

            if (filter.boardId() != null) {
                andCriteria.add(Criteria.where("board_id").is(filter.boardId()));
            }

            if (filter.taskId() != null) {
                andCriteria.add(Criteria.where("task_id").is(filter.taskId()));
            }

            Criteria createdAtCriteria = buildCreatedAtCriteria(filter.from(), filter.to());
            if (createdAtCriteria != null) {
                andCriteria.add(createdAtCriteria);
            }
        }

        if (andCriteria.size() == 1) {
            return andCriteria.get(0);
        }

        return new Criteria().andOperator(andCriteria.toArray(Criteria[]::new));
    }

    private Criteria buildCreatedAtCriteria(Instant from, Instant to) {
        if (from == null && to == null) {
            return null;
        }

        Criteria criteria = Criteria.where("created_at");
        if (from != null) {
            criteria = criteria.gte(from);
        }
        if (to != null) {
            criteria = criteria.lte(to);
        }

        return criteria;
    }
}

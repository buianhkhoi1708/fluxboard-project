package com.fluxboard.activity.repository;

import com.fluxboard.activity.dto.request.ActivityFilterRequest;
import com.fluxboard.activity.entity.ActivityEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ActivityRepositoryCustom {

    Page<ActivityEntity> findByFilter(ActivityFilterRequest filter, Pageable pageable);
}

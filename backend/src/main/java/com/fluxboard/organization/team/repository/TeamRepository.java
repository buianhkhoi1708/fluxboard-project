package com.fluxboard.organization.team.repository;

import com.fluxboard.organization.team.entity.TeamEntity;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TeamRepository extends MongoRepository<TeamEntity, String> {

    Optional<TeamEntity> findByIdAndDeletedFalse(String id);

    Page<TeamEntity> findByDeletedFalse(Pageable pageable);

    Page<TeamEntity> findByDepartmentIdAndDeletedFalse(String departmentId, Pageable pageable);

    long countByDeletedFalse();

    boolean existsByCodeAndDeletedFalse(String code);

    boolean existsByCodeAndIdNotAndDeletedFalse(String code, String id);
}

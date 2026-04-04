package com.fluxboard.project.repository;

import com.fluxboard.project.entity.ProjectEntity;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProjectRepository extends MongoRepository<ProjectEntity, String> {

    Optional<ProjectEntity> findByIdAndDeletedFalse(String id);

    Page<ProjectEntity> findByDeletedFalse(Pageable pageable);

    Page<ProjectEntity> findByDepartmentIdAndDeletedFalse(String departmentId, Pageable pageable);

    // boolean existsByCodeAndIdNotAndDeletedFalse(String code, String id);
}

package com.fluxboard.organization.department.repository;

import com.fluxboard.organization.department.entity.DepartmentEntity;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DepartmentRepository extends MongoRepository<DepartmentEntity, String> {

    Optional<DepartmentEntity> findByIdAndDeletedFalse(String id);

    Page<DepartmentEntity> findByDeletedFalse(Pageable pageable);

    long countByDeletedFalse();

    boolean existsByCodeAndDeletedFalse(String code);

    boolean existsByCodeAndIdNotAndDeletedFalse(String code, String id);
}

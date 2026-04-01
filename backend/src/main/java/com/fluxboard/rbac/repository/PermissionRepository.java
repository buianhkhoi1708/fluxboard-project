package com.fluxboard.rbac.repository;

import com.fluxboard.rbac.entity.PermissionEntity;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PermissionRepository extends MongoRepository<PermissionEntity, String> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, String id);

    Optional<PermissionEntity> findByCode(String code);
}

package com.fluxboard.rbac.repository;

import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.enums.Scope;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RoleRepository extends MongoRepository<RoleEntity, String> {

    boolean existsByNameAndScope(Role name, Scope scope);

    boolean existsByNameAndScopeAndIdNot(Role name, Scope scope, String id);

    Optional<RoleEntity> findByNameAndScope(Role name, Scope scope);
}

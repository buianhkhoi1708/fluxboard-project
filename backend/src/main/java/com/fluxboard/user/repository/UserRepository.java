package com.fluxboard.user.repository;

import com.fluxboard.user.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByIdAndDeletedFalse(String id);

    Optional<User> findByEmailAndDeletedFalse(String email);

    List<User> findByDeletedFalse();

    Page<User> findByDeletedFalse(Pageable pageable);

    List<User> findByIdInAndDeletedFalse(List<String> ids);

    boolean existsByEmailAndDeletedFalse(String email);

    boolean existsByEmailAndIdNotAndDeletedFalse(String email, String id);

    boolean existsByIdAndDeletedFalse(String id);

    long countByDeletedFalse();

    Optional<User> findByResetTokenAndDeletedFalse(String resetToken);
    long countByDepartmentIdAndDeletedFalse(String departmentId);

}

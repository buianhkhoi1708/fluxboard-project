package com.fluxboard.project.projectmember.repository;

import com.fluxboard.project.projectmember.entity.ProjectMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProjectMemberRepository extends MongoRepository<ProjectMember, String> {

    boolean existsByProjectIdAndUserIdAndDeletedFalse(String projectId, String userId);

    Optional<ProjectMember> findByIdAndDeletedFalse(String id);

    Optional<ProjectMember> findByProjectIdAndUserIdAndDeletedFalse(String projectId, String userId);

    List<ProjectMember> findByProjectIdAndDeletedFalse(String projectId);

    List<ProjectMember> findByProjectIdAndIsActiveTrue(String projectId);

    @org.springframework.data.mongodb.repository.Query("{ 'project_id': ?0, 'role_ids': ?1, 'is_active': true, 'is_deleted': false }")
    int countActiveAdmins(String projectId, String roleId);
}

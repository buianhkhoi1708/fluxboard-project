package com.fluxboard.project.projectmember.repository;

import com.fluxboard.project.projectmember.entity.ProjectMember;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends MongoRepository<ProjectMember, String> {
    boolean existsByProjectIdAndUserIdAndDeletedFalse(String projectId, String userId);

    Optional<ProjectMember> findByIdAndDeletedFalse(String id);

    Optional<ProjectMember> findByProjectIdAndUserIdAndDeletedFalse(String projectId, String userId);

    List<ProjectMember> findByProjectIdAndDeletedFalse(String projectId);

    List<ProjectMember> findByProjectIdAndIsActiveTrue(String projectId);

    List<ProjectMember> findByUserIdAndDeletedFalse(String userId);

    @Query("{ 'project_id': ?0, 'user_id': ?1, 'is_active': true, 'is_deleted': false }")
    Optional<ProjectMember> findActiveByProjectIdAndUserId(String projectId, String userId);

    @Query("{ 'project_id': ?0, 'is_active': true, 'is_deleted': false }")
    List<ProjectMember> findActiveByProjectId(String projectId);

    @Query("{ 'user_id': ?0, 'is_active': true, 'is_deleted': false }")
    List<ProjectMember> findActiveByUserId(String userId);

    @Query("{ 'project_id': ?0, 'role_ids': ?1, 'is_active': true, 'is_deleted': false }")
    List<ProjectMember> findActiveByProjectIdAndRoleId(String projectId, String roleId);

    @Query("{ 'project_id': ?0, 'role_ids': ?1, 'is_active': true, 'is_deleted': false }")
    int countActiveAdmins(String projectId, String roleId);
}
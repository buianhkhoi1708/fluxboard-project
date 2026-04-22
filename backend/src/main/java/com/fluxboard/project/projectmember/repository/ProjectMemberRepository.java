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
}

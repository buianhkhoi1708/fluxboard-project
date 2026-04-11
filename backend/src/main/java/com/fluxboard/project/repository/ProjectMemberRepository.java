package com.fluxboard.project.repository;

import com.fluxboard.project.entity.ProjectMember;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ProjectMemberRepository extends MongoRepository<ProjectMember, String> {
    
    // Hàm ông đang thiếu đây
    boolean existsByProjectIdAndUserIdAndIsActiveTrue(String projectId, String userId);

    // Tiện tay thêm luôn hàm này nếu turn trước ông chưa thêm (UserService sẽ cần)
    List<ProjectMember> findByProjectIdAndIsActiveTrue(String projectId);
}
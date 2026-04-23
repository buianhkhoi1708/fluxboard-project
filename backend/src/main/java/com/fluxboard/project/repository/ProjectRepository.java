package com.fluxboard.project.repository;

import com.fluxboard.project.entity.ProjectEntity;

import java.util.List;
import java.util.Optional; // Đảm bảo đã import cái này
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProjectRepository extends MongoRepository<ProjectEntity, String> {

    Optional<ProjectEntity> findByNameAndDeletedFalse(String name);

    Optional<ProjectEntity> findByIdAndDeletedFalse(String id);

    boolean existsByIdAndDeletedFalse(String id);

    List<ProjectEntity> findByDeletedFalse();

    Page<ProjectEntity> findByDeletedFalse(Pageable pageable);

    Page<ProjectEntity> findByDepartmentIdAndDeletedFalse(String departmentId, Pageable pageable);

    // Đếm số lượng project chưa bị xóa (Dùng cho DashboardService)
    long countByDeletedFalse();

    // Lấy danh sách tất cả project chưa bị xóa (Dùng cho DashboardService)

}

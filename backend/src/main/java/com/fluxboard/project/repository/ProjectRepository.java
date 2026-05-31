package com.fluxboard.project.repository;

import com.fluxboard.project.entity.ProjectEntity;

import java.util.List;
import java.util.Optional; 
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

    // =========================================================================
    // 🚀 BỔ SUNG: CÁC HÀM PHỤC VỤ PHÂN LẬP DỮ LIỆU (DATA ISOLATION)
    // =========================================================================
    
    // Lấy danh sách Project phân trang dựa trên danh sách ID (Dành cho Manager/Member)
    Page<ProjectEntity> findByIdInAndDeletedFalse(List<String> ids, Pageable pageable);

    // Lấy danh sách Project phân trang theo phòng ban VÀ danh sách ID (Dành cho Manager/Member)
    Page<ProjectEntity> findByDepartmentIdAndIdInAndDeletedFalse(String departmentId, List<String> ids, Pageable pageable);

}
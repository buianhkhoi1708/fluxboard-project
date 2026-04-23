package com.fluxboard.department.service;

import org.springframework.stereotype.Service;

@Service
public class DepartmentService {

    /**
     * Tạm thời gán cứng (hardcode) số lượng phòng ban là 5 để test UI Dashboard.
     * Sau này khi bạn tạo Entity và Repository cho Department, 
     * chỉ cần đổi dòng này thành: return departmentRepository.countByDeletedFalse();
     */
    public long getTotalDepartments() {
        return 5L; 
    }

}
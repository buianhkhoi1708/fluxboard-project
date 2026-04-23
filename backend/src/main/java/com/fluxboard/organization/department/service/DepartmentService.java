package com.fluxboard.organization.department.service;

import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.organization.department.entity.DepartmentEntity;
import com.fluxboard.organization.department.dto.request.CreateDepartmentRequest;
import com.fluxboard.organization.department.dto.request.UpdateDepartmentRequest;
import com.fluxboard.organization.department.dto.response.OrganizationDepartmentResponse;
import com.fluxboard.organization.department.repository.DepartmentRepository;
import com.fluxboard.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DepartmentService implements CrudService<
        OrganizationDepartmentResponse,
        String,
        CreateDepartmentRequest,
        UpdateDepartmentRequest> {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;   // 👈 inject thêm

    public DepartmentService(DepartmentRepository departmentRepository,
                             UserRepository userRepository) {
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
    }

    @Override
    public OrganizationDepartmentResponse create(CreateDepartmentRequest request) {
        String code = TextUtils.trim(request.code());
        if (departmentRepository.existsByCodeAndDeletedFalse(code)) {
            throw new AppException(ErrorCode.CONFLICT, "Department code already exists.");
        }

        DepartmentEntity entity = new DepartmentEntity();
        entity.setName(TextUtils.trim(request.name()));
        entity.setCode(code);
        entity.setDescription(TextUtils.trimToNull(request.description()));

        return toResponse(departmentRepository.save(entity));
    }

    @Override
    public OrganizationDepartmentResponse getById(String id) {
        return toResponse(findById(id));
    }

    @Override
    public Page<OrganizationDepartmentResponse> getPage(Pageable pageable) {
        return departmentRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    @Override
    public OrganizationDepartmentResponse update(String id, UpdateDepartmentRequest request) {
        DepartmentEntity entity = findById(id);
        String code = TextUtils.trim(request.code());
        if (departmentRepository.existsByCodeAndIdNotAndDeletedFalse(code, id)) {
            throw new AppException(ErrorCode.CONFLICT, "Department code already exists.");
        }

        entity.setName(TextUtils.trim(request.name()));
        entity.setCode(code);
        entity.setDescription(TextUtils.trimToNull(request.description()));

        return toResponse(departmentRepository.save(entity));
    }

    @Override
    public void delete(String id) {
        DepartmentEntity entity = findById(id);
        entity.markDeleted();
        departmentRepository.save(entity);
    }

    // ========== CÁC PHƯƠNG THỨC HỖ TRỢ CHO DASHBOARD ==========

    /**
     * Tổng số phòng ban đang hoạt động (chưa bị xóa mềm)
     */
    public long getTotalDepartments() {
        return departmentRepository.countByDeletedFalse();
    }

    /**
     * Phân bố số lượng thành viên theo từng phòng ban.
     * Trả về List<Map> với key: "department" (tên phòng ban), "count" (số người)
     */
    public List<Map<String, Object>> getMemberDistributionByDepartment() {
        List<DepartmentEntity> departments = departmentRepository.findByDeletedFalse(Pageable.unpaged()).getContent();
        List<Map<String, Object>> result = new ArrayList<>();
        for (DepartmentEntity dept : departments) {
            long count = userRepository.countByDepartmentIdAndDeletedFalse(dept.getId());
            Map<String, Object> item = new HashMap<>();
            item.put("department", dept.getName());
            item.put("count", count);
            result.add(item);
        }
        return result;
    }

    // ========== CÁC PHƯƠNG THỨC HIỆN CÓ ==========

    public boolean existsById(String id) {
        return departmentRepository.findByIdAndDeletedFalse(TextUtils.trim(id)).isPresent();
    }

    private DepartmentEntity findById(String id) {
        return departmentRepository.findByIdAndDeletedFalse(TextUtils.trim(id))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Department not found."));
    }

    private OrganizationDepartmentResponse toResponse(DepartmentEntity entity) {
        return new OrganizationDepartmentResponse(
                entity.getId(),
                entity.getName(),
                entity.getCode(),
                entity.getDescription(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

        public long countActive() {
        return departmentRepository.countByDeletedFalse();
    }

   
}
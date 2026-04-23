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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class DepartmentService implements CrudService<
        OrganizationDepartmentResponse,
        String,
        CreateDepartmentRequest,
        UpdateDepartmentRequest> {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
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

    public long countActive() {
        return departmentRepository.countByDeletedFalse();
    }

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
}

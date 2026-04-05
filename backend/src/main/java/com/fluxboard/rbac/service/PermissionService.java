package com.fluxboard.rbac.service;

import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.rbac.dto.request.CreatePermissionRequest;
import com.fluxboard.rbac.dto.request.UpdatePermissionRequest;
import com.fluxboard.rbac.dto.response.PermissionResponse;
import com.fluxboard.rbac.entity.PermissionEntity;
import com.fluxboard.rbac.repository.PermissionRepository;
import com.fluxboard.rbac.repository.RolePermissionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class PermissionService implements CrudService<PermissionResponse, String, CreatePermissionRequest, UpdatePermissionRequest> {

    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public PermissionService(
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository
    ) {
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    @Override
    public PermissionResponse create(CreatePermissionRequest request) {
        String normalizedCode = TextUtils.trim(request.code());
        String normalizedModule = TextUtils.trim(request.module());
        if (permissionRepository.existsByCode(normalizedCode)) {
            throw new AppException(ErrorCode.CONFLICT, "Permission code already exists.");
        }

        PermissionEntity entity = new PermissionEntity();
        entity.setCode(normalizedCode);
        entity.setModule(normalizedModule);
        entity.setDescription(TextUtils.trimToNull(request.description()));

        return toResponse(permissionRepository.save(entity));
    }

    @Override
    public PermissionResponse getById(String id) {
        return toResponse(findPermissionById(id));
    }

    @Override
    public Page<PermissionResponse> getPage(Pageable pageable) {
        return permissionRepository.findAll(pageable).map(this::toResponse);
    }

    @Override
    public PermissionResponse update(String id, UpdatePermissionRequest request) {
        PermissionEntity entity = findPermissionById(id);
        String normalizedCode = TextUtils.trim(request.code());
        String normalizedModule = TextUtils.trim(request.module());

        if (permissionRepository.existsByCodeAndIdNot(normalizedCode, id)) {
            throw new AppException(ErrorCode.CONFLICT, "Permission code already exists.");
        }

        entity.setCode(normalizedCode);
        entity.setModule(normalizedModule);
        entity.setDescription(TextUtils.trimToNull(request.description()));

        return toResponse(permissionRepository.save(entity));
    }

    @Override
    public void delete(String id) {
        PermissionEntity entity = findPermissionById(id);
        rolePermissionRepository.deleteByPermissionId(entity.getId());
        permissionRepository.delete(entity);
    }

    PermissionEntity findPermissionById(String permissionId) {
        return permissionRepository.findById(permissionId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Permission not found."));
    }

    PermissionEntity findPermissionByCode(String code) {
        return permissionRepository.findByCode(code)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Permission not found."));
    }

    private PermissionResponse toResponse(PermissionEntity entity) {
        return new PermissionResponse(
                entity.getId(),
                entity.getCode(),
                entity.getModule(),
                entity.getDescription(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}

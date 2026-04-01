// Chuẩn CRUD service interface, có thể tái sử dụng cho nhiều entity khác nhau

package com.fluxboard.common.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CrudService<RESPONSE, ID, CREATE_REQUEST, UPDATE_REQUEST> {

    RESPONSE create(CREATE_REQUEST request);

    RESPONSE getById(ID id);

    Page<RESPONSE> getPage(Pageable pageable);

    RESPONSE update(ID id, UPDATE_REQUEST request);

    void delete(ID id);
}

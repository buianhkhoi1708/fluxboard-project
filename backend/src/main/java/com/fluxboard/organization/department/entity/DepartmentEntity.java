package com.fluxboard.organization.department.entity;

import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "departments")
@CompoundIndex(name = "uniq_department_code_active", def = "{'code': 1, 'is_deleted': 1}", unique = true)
public class DepartmentEntity extends BaseDocument {

    @Field("name")
    private String name;

    @Field("code")
    private String code;

    @Field("description")
    private String description;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}

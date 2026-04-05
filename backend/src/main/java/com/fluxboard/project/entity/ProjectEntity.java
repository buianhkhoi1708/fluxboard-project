package com.fluxboard.project.entity;

import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.CompoundIndex;
// import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "projects")
@CompoundIndex(name = "idx_department_status", def = "{'department_id': 1, 'status': 1}")
public class ProjectEntity extends BaseDocument {

    // @Indexed(unique = true)
    // @Field("code")
    // private String code;

    @Field("name")
    private String name;

    @Field("owner_id")
    private String ownerId;

    @Field("department_id")
    private String departmentId;

    @Field("status")
    private String status;

    // public String getCode() {
    // return code;
    // }

    // public void setCode(String code) {
    // this.code = code;
    // }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(String ownerId) {
        this.ownerId = ownerId;
    }

    public String getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(String departmentId) {
        this.departmentId = departmentId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}

package com.fluxboard.organization.team.entity;

import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "teams")
@CompoundIndexes({
        @CompoundIndex(name = "uniq_team_code_active", def = "{'code': 1, 'is_deleted': 1}", unique = true),
        @CompoundIndex(name = "idx_team_department_active", def = "{'department_id': 1, 'is_deleted': 1}")
})
public class TeamEntity extends BaseDocument {

    @Field("name")
    private String name;

    @Field("code")
    private String code;

    @Field("department_id")
    private String departmentId;

    @Field("description")
    private String description;

    @Field("lead_id")
    private String leadId;

    @Field("status")
    private String status = "ACTIVE";

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

    public String getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(String departmentId) {
        this.departmentId = departmentId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLeadId() {
        return leadId;
    }

    public void setLeadId(String leadId) {
        this.leadId = leadId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}

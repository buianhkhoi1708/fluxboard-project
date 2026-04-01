package com.fluxboard.rbac.entity;

import com.fluxboard.common.entity.BaseDocument;
import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.enums.Scope;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "roles")
@CompoundIndex(name = "uniq_role_name_scope", def = "{'name': 1, 'scope': 1}", unique = true)
public class RoleEntity extends BaseDocument {

    @Field("name")
    private Role name;

    @Field("scope")
    private Scope scope;

    @Field("description")
    private String description;

    public Role getName() {
        return name;
    }

    public void setName(Role name) {
        this.name = name;
    }

    public Scope getScope() {
        return scope;
    }

    public void setScope(Scope scope) {
        this.scope = scope;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}

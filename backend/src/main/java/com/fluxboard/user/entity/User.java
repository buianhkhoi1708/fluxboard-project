package com.fluxboard.user.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "users")
public class User extends BaseDocument {

    @Indexed(unique = true)
    @Field("email")
    private String email;

    @JsonIgnore
    @Field("password")
    private String password;

    @Field("full_name")
    private String fullName;

    @Field("avatar_url")
    private String avatarUrl = "https://ui-avatars.com/api/?name=User&background=random";

    @Field("role_id")
    private String roleId;

    @Field("department_id")
    private String departmentId;

    @Field("team_id")
    private String teamId;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getRoleId() {
        return roleId;
    }

    public void setRoleId(String roleId) {
        this.roleId = roleId;
    }

    public String getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(String departmentId) {
        this.departmentId = departmentId;
    }

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }
}

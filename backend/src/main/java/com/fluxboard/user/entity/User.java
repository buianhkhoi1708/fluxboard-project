package com.fluxboard.user.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fluxboard.common.entity.BaseDocument;

import java.time.Instant;

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

    @Field("team_id")
    private String teamId;

    @Field("status")
    private String status = "ACTIVE";

    @JsonIgnore
    @Field("reset_token")
    private String resetToken;

    @JsonIgnore
    @Field("reset_token_expiry")
    private Instant resetTokenExpiry;

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

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }


    public String getResetToken() {
        return resetToken;
    }

    public void setResetToken(String resetToken) {
        this.resetToken = resetToken;
    }

    public Instant getResetTokenExpiry() {
        return resetTokenExpiry;
    }

    public void setResetTokenExpiry(Instant resetTokenExpiry) {
        this.resetTokenExpiry = resetTokenExpiry;
    }
}

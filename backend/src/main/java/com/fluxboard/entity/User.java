package com.fluxboard.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @Indexed(unique = true) 
    private String email; 

    @JsonIgnore
    private String password; 

    @JsonProperty("full_name")
    private String fullName; 

    @JsonProperty("avatar_url")
    private String avatarUrl = "https://ui-avatars.com/api/?name=User&background=random"; 

    private Role role; 

    @CreatedDate
    @JsonProperty("created_at")
    private Instant createdAt;

    @LastModifiedDate
    @JsonProperty("updated_at")
    private Instant updatedAt;
    
    public enum Role {
        ADMIN, 
        USER   
    }
}
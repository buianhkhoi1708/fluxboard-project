package com.fluxboard.activity.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@Document(collection = "activities")
public class ActivityEntity {
    @Id
    private String id;

    @Field("project_id")
    private String projectId;

    @Field("user_id")
    private String userId;

    private String action;

    @Field("ip_address")
    private String ipAddress;

    @Field("device_info")
    private String deviceInfo;

    private LocalDateTime createdAt = LocalDateTime.now();
}
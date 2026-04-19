package com.fluxboard.user.entity;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "user_notification_prefs")
@Getter
@Setter
@Builder
public class UserNotificationPrefEntity {
    @Id
    private String id;
    
    @Field("user_id")
    private String userId;
    
    @Field("email_notifications_enabled")
    private boolean emailNotificationsEnabled;
    
    @Field("in_app_notifications_enabled")
    private boolean inAppNotificationsEnabled;
}
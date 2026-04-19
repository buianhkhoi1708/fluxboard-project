package com.fluxboard.activity.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class LoginHistoryResponse {
    @JsonProperty("timestamp")
    private LocalDateTime timestamp;
    
    @JsonProperty("ip_address")
    private String ipAddress;
    
    @JsonProperty("device_info")
    private String deviceInfo;
}
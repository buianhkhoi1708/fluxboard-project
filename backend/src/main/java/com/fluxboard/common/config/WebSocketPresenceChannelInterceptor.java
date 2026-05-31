package com.fluxboard.common.config;

import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.auth.service.JwtTokenService;
import com.fluxboard.user.service.UserPresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WebSocketPresenceChannelInterceptor implements ChannelInterceptor {
    private final JwtTokenService jwtTokenService;
    private final UserPresenceService presenceService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;

        if (accessor.getCommand() == StompCommand.CONNECT) {
            handleConnect(accessor);
        } else if (accessor.getCommand() == StompCommand.DISCONNECT) {
            presenceService.markOfflineBySession(accessor.getSessionId());
        }
        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String token = extractToken(accessor);
        if (token == null) return;

        try {
            AuthenticatedUser user = jwtTokenService.parseAccessToken(token);
            presenceService.markOnline(user.userId(), accessor.getSessionId());
            accessor.setUser(user::userId);
        } catch (Exception ignored) {
            // Không chặn socket cũ của FE; chỉ không đánh dấu online nếu token sai/thiếu.
        }
    }

    private String extractToken(StompHeaderAccessor accessor) {
        String raw = firstHeader(accessor, "Authorization");
        if (raw == null) raw = firstHeader(accessor, "authorization");
        if (raw == null) raw = firstHeader(accessor, "token");
        if (raw == null) raw = firstHeader(accessor, "access_token");
        if (raw == null || raw.isBlank()) return null;
        raw = raw.trim();
        return raw.regionMatches(true, 0, "Bearer ", 0, 7) ? raw.substring(7).trim() : raw;
    }

    private String firstHeader(StompHeaderAccessor accessor, String name) {
        return accessor.getFirstNativeHeader(name);
    }
}
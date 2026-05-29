package com.fluxboard.user.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class UserPresenceService {
    private static final Duration HEARTBEAT_TTL = Duration.ofSeconds(90);
    private final ConcurrentMap<String, Set<String>> sessionsByUser = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, String> userBySession = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Instant> lastSeenByUser = new ConcurrentHashMap<>();

    public void markOnline(String userId, String sessionId) {
        if (isBlank(userId) || isBlank(sessionId)) return;
        userBySession.put(sessionId, userId);
        sessionsByUser.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(sessionId);
        lastSeenByUser.put(userId, Instant.now());
    }

    public void markOfflineBySession(String sessionId) {
        if (isBlank(sessionId)) return;
        String userId = userBySession.remove(sessionId);
        if (userId == null) return;

        Set<String> sessions = sessionsByUser.get(userId);
        if (sessions != null) {
            sessions.remove(sessionId);
            if (sessions.isEmpty()) sessionsByUser.remove(userId);
        }
        lastSeenByUser.put(userId, Instant.now());
    }

    public void heartbeat(String userId) {
        if (!isBlank(userId)) lastSeenByUser.put(userId, Instant.now());
    }

    public boolean isOnline(String userId) {
        if (isBlank(userId)) return false;
        Set<String> sessions = sessionsByUser.get(userId);
        if (sessions != null && !sessions.isEmpty()) return true;

        Instant lastSeen = lastSeenByUser.get(userId);
        return lastSeen != null && lastSeen.isAfter(Instant.now().minus(HEARTBEAT_TTL));
    }

    public Instant getLastSeenAt(String userId) {
        return isBlank(userId) ? null : lastSeenByUser.get(userId);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
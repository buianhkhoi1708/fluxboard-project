package com.fluxboard.auth.service;

import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List; 
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class JwtTokenService {

    private final SecretKey secretKey;
    private final long expirationMinutes;
    private final String issuer;

    public JwtTokenService(
            @Value("${auth.jwt.secret}") String secret,
            @Value("${auth.jwt.expiration-minutes:120}") long expirationMinutes,
            @Value("${auth.jwt.issuer:fluxboard-backend}") String issuer
    ) {
        if (!StringUtils.hasText(secret)) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "JWT secret is not configured.");
        }

        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "JWT secret must be at least 32 bytes.");
        }

        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMinutes = expirationMinutes;
        this.issuer = issuer;
    }

    public TokenIssueResult issueAccessToken(String userId, String roleId) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(expirationMinutes, ChronoUnit.MINUTES);

        String token = Jwts.builder()
                .subject(userId)
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim("roleId", roleId)
                .signWith(secretKey)
                .compact();

        return new TokenIssueResult(token, expiresAt);
    }

    public AuthenticatedUser parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String userId = claims.getSubject();
            String roleId = claims.get("roleId", String.class);
            
            List<String> authorities = claims.get("authorities", List.class);
            if (authorities == null) {
                authorities = List.of();
            }

            if (!StringUtils.hasText(userId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid access token.");
            }

            return new AuthenticatedUser(userId, roleId, authorities); 
        } catch (JwtException | IllegalArgumentException ex) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid or expired access token.");
        }
    }

    public record TokenIssueResult(
            String accessToken,
            Instant expiresAt
    ) {
    }
}
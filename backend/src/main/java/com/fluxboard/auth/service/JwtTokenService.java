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
    private final long refreshExpirationDays; 
    private final String issuer;

    public JwtTokenService(
            @Value("${auth.jwt.secret}") String secret,
            @Value("${auth.jwt.expiration-minutes:120}") long expirationMinutes,
            @Value("${auth.jwt.refresh-expiration-days:30}") long refreshExpirationDays, // Mặc định 30 ngày
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
        this.refreshExpirationDays = refreshExpirationDays;
        this.issuer = issuer;
    }

    public TokenIssueResult issueAccessToken(String userId, String roleId, List<String> authorities) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(expirationMinutes, ChronoUnit.MINUTES);

        String token = Jwts.builder()
                .subject(userId)
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim("roleId", roleId)
                .claim("authorities", authorities != null ? authorities : List.of())
                .claim("type", "ACCESS") 
                .signWith(secretKey)
                .compact();

        return new TokenIssueResult(token, expiresAt);
    }


    public TokenIssueResult issueRefreshToken(String userId) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(refreshExpirationDays, ChronoUnit.DAYS);

        String token = Jwts.builder()
                .subject(userId)
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim("type", "REFRESH") 
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

            if (!"ACCESS".equals(claims.get("type", String.class))) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid token type. Expected ACCESS token.");
            }

            String userId = claims.getSubject();
            String roleId = claims.get("roleId", String.class);
            List<String> authorities = claims.get("authorities", List.class);

            if (!StringUtils.hasText(userId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid access token.");
            }

            return new AuthenticatedUser(userId, roleId, authorities != null ? authorities : List.of());
        } catch (JwtException | IllegalArgumentException ex) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid or expired access token.");
        }
    }

    public String parseRefreshToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!"REFRESH".equals(claims.get("type", String.class))) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid token type. Expected REFRESH token.");
            }

            String userId = claims.getSubject();
            if (!StringUtils.hasText(userId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid refresh token.");
            }

            return userId;
        } catch (JwtException | IllegalArgumentException ex) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid or expired refresh token. Please login again.");
        }
    }

    public record TokenIssueResult(
            String token,
            Instant expiresAt
    ) {
    }
}
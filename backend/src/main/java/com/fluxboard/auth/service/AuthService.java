package com.fluxboard.auth.service;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.auth.dto.request.ChangePasswordRequest;
import com.fluxboard.auth.dto.request.ForgotPasswordRequest;
import com.fluxboard.auth.dto.request.LoginRequest;
import com.fluxboard.auth.dto.request.RefreshTokenRequest;
import com.fluxboard.auth.dto.request.ResetPasswordRequest;
import com.fluxboard.auth.dto.response.LoginResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.email.service.EmailService;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.repository.RoleRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final JwtTokenService jwtTokenService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final RoleRepository roleRepository;
    private final ActivityService activityService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();

    private Bucket resolveBucket(String email) {
        return loginBuckets.computeIfAbsent(email, k -> {
            Refill refill = Refill.intervally(5, Duration.ofMinutes(15));
            Bandwidth limit = Bandwidth.classic(5, refill);
            return Bucket.builder().addLimit(limit).build();
        });
    }

    public LoginResponse login(LoginRequest request) {
        return login(request, null);
    }

    public LoginResponse login(LoginRequest request, HttpServletRequest servletRequest) {
        String email = TextUtils.trim(request.email());
        Bucket bucket = resolveBucket(email);
        if (!bucket.tryConsume(1)) throw new AppException(ErrorCode.TOO_MANY_REQUESTS, "Too many login attempts. Please try again later.");

        User user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Invalid email or password."));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid email or password.");
        }

        String roleName = resolveRoleName(user.getRoleId());
        List<String> authorities = buildAuthorities(user.getRoleId(), roleName);
        var accessResult = jwtTokenService.issueAccessToken(user.getId(), user.getRoleId(), authorities);
        var refreshResult = jwtTokenService.issueRefreshToken(user.getId());

        activityService.log(
                ActivityEntity.ActivityType.SECURITY_AUDIT,
                ActivitySource.AUTH,
                user.getId(),
                null,
                null,
                null,
                user.getId(),
                user.getId(),
                ActivityAction.LOGIN,
                null,
                null,
                null,
                "Người dùng đăng nhập",
                clientIp(servletRequest),
                deviceInfo(servletRequest),
                Map.of("email", user.getEmail(), "role_name", roleName == null ? "" : roleName)
        );

        return new LoginResponse(
                accessResult.token(), "Bearer", accessResult.expiresAt(), refreshResult.token(),
                user.getId(), user.getEmail(), user.getFullName(), user.getRoleId(), roleName
        );
    }

    public LoginResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = TextUtils.trim(request.refreshToken());
        String userId = jwtTokenService.parseRefreshToken(refreshToken);

        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "User account no longer exists."));

        String roleName = resolveRoleName(user.getRoleId());
        List<String> authorities = buildAuthorities(user.getRoleId(), roleName);
        var accessResult = jwtTokenService.issueAccessToken(user.getId(), user.getRoleId(), authorities);
        var refreshResult = jwtTokenService.issueRefreshToken(user.getId());

        return new LoginResponse(
                accessResult.token(), "Bearer", accessResult.expiresAt(), refreshResult.token(),
                user.getId(), user.getEmail(), user.getFullName(), user.getRoleId(), roleName
        );
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        String email = TextUtils.trim(request.email());
        Optional<User> userOpt = userRepository.findByEmailAndDeletedFalse(email);
        if (userOpt.isEmpty()) return;

        User user = userOpt.get();
        String resetToken = UUID.randomUUID().toString();
        user.setResetToken(hashToken(resetToken));
        user.setResetTokenExpiry(Instant.now().plus(15, ChronoUnit.MINUTES));
        userRepository.save(user);

        String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
        emailService.sendPasswordResetEmail(email, resetLink);
    }

    public void verifyResetToken(String token) {
        String hashedToken = hashToken(TextUtils.trim(token));
        User user = userRepository.findByResetTokenAndDeletedFalse(hashedToken)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token."));

        if (user.getResetTokenExpiry() == null || Instant.now().isAfter(user.getResetTokenExpiry())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token.");
        }
    }

    public void resetPassword(ResetPasswordRequest request) {
        resetPassword(request, null);
    }

    public void resetPassword(ResetPasswordRequest request, HttpServletRequest servletRequest) {
        String hashedToken = hashToken(TextUtils.trim(request.token()));
        String newPassword = TextUtils.trim(request.newPassword());

        User user = userRepository.findByResetTokenAndDeletedFalse(hashedToken)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token."));

        if (user.getResetTokenExpiry() == null || Instant.now().isAfter(user.getResetTokenExpiry())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        activityService.log(
                ActivityEntity.ActivityType.SECURITY_AUDIT,
                ActivitySource.AUTH,
                user.getId(),
                null,
                null,
                null,
                user.getId(),
                user.getId(),
                ActivityAction.PASSWORD_RESET,
                "password",
                null,
                null,
                "Người dùng đặt lại mật khẩu",
                clientIp(servletRequest),
                deviceInfo(servletRequest),
                Map.of("email", user.getEmail())
        );
    }

    public void changePassword(String userId, ChangePasswordRequest request) {
        changePassword(userId, request, null);
    }

    public void changePassword(String userId, ChangePasswordRequest request, HttpServletRequest servletRequest) {
        String normalizedUserId = TextUtils.trimToNull(userId);
        if (!StringUtils.hasText(normalizedUserId)) throw new AppException(ErrorCode.UNAUTHORIZED, "Authenticated user is required.");

        User user = userRepository.findByIdAndDeletedFalse(normalizedUserId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found."));

        String currentPassword = TextUtils.trim(request.currentPassword());
        String newPassword = TextUtils.trim(request.newPassword());
        String confirmNewPassword = TextUtils.trim(request.confirmNewPassword());

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) throw new AppException(ErrorCode.BAD_REQUEST, "Current password is incorrect.");
        if (!newPassword.equals(confirmNewPassword)) throw new AppException(ErrorCode.BAD_REQUEST, "New password and confirm new password do not match.");
        if (passwordEncoder.matches(newPassword, user.getPassword())) throw new AppException(ErrorCode.BAD_REQUEST, "New password must be different from current password.");

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        activityService.logPasswordChanged(user.getId(), clientIp(servletRequest), deviceInfo(servletRequest));
    }

    private List<String> buildAuthorities(String roleId, String roleName) {
        List<String> result = new ArrayList<>();
        if (StringUtils.hasText(roleId)) result.add(roleId);
        if (StringUtils.hasText(roleName)) {
            result.add(roleName);
            result.add("ROLE_" + roleName);
        }
        return result;
    }

    private String resolveRoleName(String roleId) {
        if (!StringUtils.hasText(roleId)) return null;
        return roleRepository.findById(roleId).map(RoleEntity::getName).map(Enum::name).orElse(null);
    }

    private String clientIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    private String deviceInfo(HttpServletRequest request) {
        return request == null ? null : request.getHeader("User-Agent");
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Error hashing token.");
        }
    }
}
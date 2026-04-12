package com.fluxboard.auth.service;

import com.fluxboard.auth.dto.request.ChangePasswordRequest;
import com.fluxboard.auth.dto.request.ForgotPasswordRequest;
import com.fluxboard.auth.dto.request.LoginRequest;
import com.fluxboard.auth.dto.request.ResetPasswordRequest;
import com.fluxboard.auth.dto.response.LoginResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.email.service.EmailService;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenService jwtTokenService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService; 
    private final Map<String, Bucket> rateLimitCache = new ConcurrentHashMap<>();

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public AuthService(UserRepository userRepository, JwtTokenService jwtTokenService, EmailService emailService) {
        this.userRepository = userRepository;
        this.jwtTokenService = jwtTokenService;
        this.emailService = emailService;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    public LoginResponse login(LoginRequest request) {
        String email = TextUtils.trim(request.email());
        User user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Invalid email or password."));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid email or password.");
        }

        JwtTokenService.TokenIssueResult token = jwtTokenService.issueAccessToken(user.getId(), user.getRoleId());

        return new LoginResponse(
                token.accessToken(),
                "Bearer",
                token.expiresAt(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRoleId());
    }

    private Bucket resolveBucket(String key) {
        return rateLimitCache.computeIfAbsent(key, k -> {
            Bandwidth limit = Bandwidth.classic(3, Refill.greedy(3, Duration.ofMinutes(15)));
            return Bucket.builder().addLimit(limit).build();
        });
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedHash.length);
            for (byte b : encodedHash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing token", e);
        }
    }

    public String processForgotPassword(ForgotPasswordRequest request, String clientIp) {
        Bucket bucket = resolveBucket(clientIp);
        if (!bucket.tryConsume(1)) {
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS, "Too many requests. Please try again in 15 minutes.");
        }

        Optional<User> userOptional = userRepository.findByEmailAndDeletedFalse(request.email());

        if (userOptional.isEmpty()) {
            passwordEncoder.encode(UUID.randomUUID().toString());
            return "If the email exists, a reset link will be sent.";
        }

        User user = userOptional.get();

        String plainToken = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        String hashedToken = hashToken(plainToken);

        Instant expiryDate = Instant.now().plus(15, ChronoUnit.MINUTES);

        user.setResetToken(hashedToken);
        user.setResetTokenExpiry(expiryDate);
        userRepository.save(user);

        String resetLink = frontendUrl + "/reset-password?token=" + plainToken;

        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);

        return "If the email exists, a reset link has been sent to your email address.";
    }

    public void verifyResetToken(String token) {
        String hashedIncomingToken = hashToken(token);
        User user = userRepository.findByResetTokenAndDeletedFalse(hashedIncomingToken)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token."));

        if (user.getResetTokenExpiry().isBefore(Instant.now())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Reset token has expired.");
        }
    }

    public void processResetPassword(ResetPasswordRequest request) {
        String hashedIncomingToken = hashToken(request.token());

        User user = userRepository.findByResetTokenAndDeletedFalse(hashedIncomingToken)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token."));

        if (user.getResetTokenExpiry().isBefore(Instant.now())) {
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            userRepository.save(user);
            throw new AppException(ErrorCode.BAD_REQUEST, "Reset token has expired. Please request a new one.");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);

        userRepository.save(user);
    }

    public void changePassword(String userId, ChangePasswordRequest request) {
        String normalizedUserId = TextUtils.trimToNull(userId);
        if (!StringUtils.hasText(normalizedUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Authenticated user is required.");
        }

        User user = userRepository.findByIdAndDeletedFalse(normalizedUserId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found."));

        String currentPassword = TextUtils.trim(request.currentPassword());
        String newPassword = TextUtils.trim(request.newPassword());
        String confirmNewPassword = TextUtils.trim(request.confirmNewPassword());

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Current password is incorrect.");
        }

        if (!newPassword.equals(confirmNewPassword)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "New password and confirm new password do not match.");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "New password must be different from current password.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }
}

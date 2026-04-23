package com.fluxboard.auth.service;

import com.fluxboard.auth.dto.request.ChangePasswordRequest;
import com.fluxboard.auth.dto.request.ForgotPasswordRequest;
import com.fluxboard.auth.dto.request.LoginRequest;
import com.fluxboard.auth.dto.request.ResetPasswordRequest;
import com.fluxboard.auth.dto.request.RefreshTokenRequest;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenService jwtTokenService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;

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
        String email = TextUtils.trim(request.email());
        Bucket bucket = resolveBucket(email);

        if (!bucket.tryConsume(1)) {
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS, "Too many login attempts. Please try again later.");
        }

        User user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Invalid email or password."));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid email or password.");
        }

        List<String> authorities = List.of(); 

        var accessResult = jwtTokenService.issueAccessToken(user.getId(), user.getRoleId(), authorities);
        var refreshResult = jwtTokenService.issueRefreshToken(user.getId());

        return new LoginResponse(
                accessResult.token(),
                "Bearer",
                accessResult.expiresAt(),
                refreshResult.token(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRoleId()
        );
    }

    public LoginResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = TextUtils.trim(request.refreshToken());

        String userId = jwtTokenService.parseRefreshToken(refreshToken);

        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "User account no longer exists."));

        List<String> authorities = List.of(); 

        var accessResult = jwtTokenService.issueAccessToken(user.getId(), user.getRoleId(), authorities);
        var refreshResult = jwtTokenService.issueRefreshToken(user.getId());

        return new LoginResponse(
                accessResult.token(),
                "Bearer",
                accessResult.expiresAt(),
                refreshResult.token(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRoleId()
        );
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        String email = TextUtils.trim(request.email());
        Optional<User> userOpt = userRepository.findByEmailAndDeletedFalse(email);

        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();
        String resetToken = UUID.randomUUID().toString();
        String hashedToken = hashToken(resetToken);

        user.setResetToken(hashedToken);
        user.setResetTokenExpiry(Instant.now().plus(15, ChronoUnit.MINUTES));
        userRepository.save(user);

        // Xóa tham số email thừa trên URL, chỉ gửi đúng token
        String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
        emailService.sendPasswordResetEmail(email, resetLink);
    }

    // Hàm xác thực Token khi Frontend gọi API verify-reset-token
    public void verifyResetToken(String token) {
        String hashedToken = hashToken(TextUtils.trim(token));
        
        User user = userRepository.findByResetTokenAndDeletedFalse(hashedToken)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token."));
        
        if (user.getResetTokenExpiry() == null || Instant.now().isAfter(user.getResetTokenExpiry())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token.");
        }
    }

    public void resetPassword(ResetPasswordRequest request) {
        String token = TextUtils.trim(request.token());
        String newPassword = TextUtils.trim(request.newPassword());
        
        // 1. Mã hóa cái token người dùng gửi lên 
        String hashedToken = hashToken(token);

        // 2. Tìm thẳng User bằng Token luôn, không cần hỏi Email
        User user = userRepository.findByResetTokenAndDeletedFalse(hashedToken)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token."));

        // 3. Kiểm tra hạn sử dụng (15 phút)
        if (user.getResetTokenExpiry() == null || Instant.now().isAfter(user.getResetTokenExpiry())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Invalid or expired reset token.");
        }

        // 4. Lưu lại mật khẩu và dọn dẹp token cũ
        user.setPassword(passwordEncoder.encode(newPassword));
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
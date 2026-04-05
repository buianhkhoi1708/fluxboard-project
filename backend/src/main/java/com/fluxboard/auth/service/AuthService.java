package com.fluxboard.auth.service;

import com.fluxboard.auth.dto.request.LoginRequest;
import com.fluxboard.auth.dto.response.LoginResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenService jwtTokenService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, JwtTokenService jwtTokenService) {
        this.userRepository = userRepository;
        this.jwtTokenService = jwtTokenService;
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
                user.getRoleId()
        );
    }
}

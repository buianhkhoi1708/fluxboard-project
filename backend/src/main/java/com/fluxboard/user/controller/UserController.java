package com.fluxboard.user.controller;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.media.service.MediaService;
import com.fluxboard.rbac.annotation.RequirePermission;
import com.fluxboard.user.dto.request.CreateUserRequest;
import com.fluxboard.user.dto.request.UpdateAccountRoleRequest;
import com.fluxboard.user.dto.request.UpdateNotificationPrefRequest;
import com.fluxboard.user.dto.request.UpdateUserRequest;
import com.fluxboard.user.dto.response.UnassignedUserResponse;
import com.fluxboard.user.dto.response.UserNotificationPrefResponse;
import com.fluxboard.user.dto.response.UserResponse;
import com.fluxboard.user.service.UserNotificationPrefService;
import com.fluxboard.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final MediaService mediaService;
    private final UserNotificationPrefService notificationPrefService;

    @PostMapping
    @RequirePermission("USER_CREATE")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        return ResponseFactory.created("User created successfully.", userService.create(request, authUser.userId()));
    }

    @RequirePermission("USER_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsers(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseFactory.paged("Users retrieved successfully.", userService.getPage(pageable));
    }

    @RequirePermission("USER_VIEW")
    @GetMapping("/accounts")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAccountsForActivityPage(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        return ResponseFactory.paged("Account management users retrieved successfully.", userService.getAccountManagementPage(pageable, authUser));
    }

    @RequirePermission("USER_UPDATE")
    @PatchMapping("/accounts/{userId}/role")
    public ResponseEntity<ApiResponse<UserResponse>> updateAccountRole(
            @PathVariable String userId,
            @Valid @RequestBody UpdateAccountRoleRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        return ResponseFactory.ok("Account role updated successfully.", userService.updateAccountRole(userId, request.roleId(), authUser));
    }

    @RequirePermission("USER_DELETE")
    @DeleteMapping("/accounts/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteAccountFromManagement(
            @PathVariable String userId,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        userService.deleteAccountFromManagement(userId, authUser);
        return ResponseFactory.ok("Account deleted successfully.");
    }

    @PostMapping("/me/presence/heartbeat")
    public ResponseEntity<ApiResponse<Void>> heartbeat(
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        userService.heartbeat(authUser.userId());
        return ResponseFactory.ok("Presence heartbeat accepted.");
    }

    @RequirePermission("USER_VIEW")
    @GetMapping("/unassigned")
    public ResponseEntity<ApiResponse<List<UnassignedUserResponse>>> getUnassignedUsers() {
        return ResponseFactory.ok("Unassigned users retrieved successfully.", userService.getUnassignedUsers());
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable String userId) {
        return ResponseFactory.ok("User retrieved successfully.", userService.getById(userId));
    }

    @RequirePermission("USER_UPDATE")
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        return ResponseFactory.ok("User updated successfully.", userService.update(userId, request, authUser.userId()));
    }

    @RequirePermission("USER_DELETE")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable String userId,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        userService.delete(userId, authUser.userId());
        return ResponseFactory.ok("User deleted successfully.");
    }

    @GetMapping("/{userId}/avatar/presigned-url")
    public ResponseEntity<ApiResponse<Map<String, String>>> getAvatarPresignedUrl(
            @PathVariable String userId,
            @RequestParam String fileName,
            @RequestParam String contentType,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        resolveAndVerifyUserId(userId, authUser);

        if (contentType == null || !contentType.startsWith("image/")) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Only valid image formats are allowed!");
        }

        Map<String, String> s3Data = mediaService.generatePresignedUrl(fileName, contentType);
        return ResponseFactory.ok("Presigned URL generated successfully.", s3Data);
    }

    @PutMapping("/{userId}/avatar")
    public ResponseEntity<ApiResponse<String>> updateAvatarProfile(
            @PathVariable String userId,
            @RequestBody Map<String, String> requestBody,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        String targetUserId = resolveAndVerifyUserId(userId, authUser);
        String avatarUrl = requestBody.get("avatar_url");

        if (avatarUrl == null || avatarUrl.isBlank()) {
            avatarUrl = requestBody.get("avatarUrl");
        }

        if (avatarUrl == null || avatarUrl.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Invalid image URL!");
        }

        userService.updateAvatarUrl(targetUserId, avatarUrl);
        return ResponseFactory.ok("Profile avatar updated successfully.", avatarUrl);
    }

    @GetMapping("/{userId}/notifications/preferences")
    public ResponseEntity<ApiResponse<UserNotificationPrefResponse>> getNotificationPreferences(
            @PathVariable String userId,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        String targetUserId = resolveAndVerifyUserId(userId, authUser);
        return ResponseFactory.ok("Notification preferences retrieved.", notificationPrefService.getPreferencesByUserId(targetUserId));
    }

    @PutMapping("/{userId}/notifications/preferences")
    public ResponseEntity<ApiResponse<UserNotificationPrefResponse>> updateNotificationPreferences(
            @PathVariable String userId,
            @Valid @RequestBody UpdateNotificationPrefRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser) {
        String targetUserId = resolveAndVerifyUserId(userId, authUser);
        return ResponseFactory.ok("Notification preferences updated.", notificationPrefService.updatePreferences(targetUserId, request));
    }

    private String resolveAndVerifyUserId(String requestedUserId, AuthenticatedUser currentUser) {
        if (currentUser == null) throw new AppException(ErrorCode.UNAUTHORIZED, "Security: Please log in first!");

        String targetUserId = "me".equals(requestedUserId) ? currentUser.userId() : requestedUserId;
        if (targetUserId.equals(currentUser.userId())) return targetUserId;
        if (userService.isSystemAdmin(currentUser)) return targetUserId;

        throw new AppException(ErrorCode.FORBIDDEN, "Security: You do not have permission to access other users' data!");
    }
}
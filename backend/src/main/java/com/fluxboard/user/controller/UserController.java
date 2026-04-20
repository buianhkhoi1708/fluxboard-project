package com.fluxboard.user.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import com.fluxboard.activity.dto.response.LoginHistoryResponse;
import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser; 
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.media.service.MediaService;
import com.fluxboard.rbac.annotation.RequirePermission;
import com.fluxboard.user.dto.request.CreateUserRequest;
import com.fluxboard.user.dto.request.UpdateNotificationPrefRequest;
import com.fluxboard.user.dto.request.UpdateUserRequest;
import com.fluxboard.user.dto.response.UserNotificationPrefResponse;
import com.fluxboard.user.dto.response.UserResponse;
import com.fluxboard.user.service.UserNotificationPrefService;
import com.fluxboard.user.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    private final MediaService mediaService;
    private final UserNotificationPrefService notificationPrefService;
    private final ActivityService activityService;

    public UserController(
            UserService userService,
            MediaService mediaService,
            UserNotificationPrefService notificationPrefService,
            ActivityService activityService) {
        this.userService = userService;
        this.mediaService = mediaService;
        this.notificationPrefService = notificationPrefService;
        this.activityService = activityService;
    }

    @PostMapping
    @RequirePermission("USER_CREATE")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseFactory.created("User created successfully.", userService.create(request));
    }

    @RequirePermission("USER_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsers(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<UserResponse> page = userService.getPage(pageable);
        return ResponseFactory.paged("Users retrieved successfully.", page);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable String userId) {
        return ResponseFactory.ok("User retrieved successfully.", userService.getById(userId));
    }

    @RequirePermission("USER_UPDATE")
    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseFactory.ok("User updated successfully.", userService.update(userId, request));
    }

    @RequirePermission("USER_DELETE")
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String userId) {
        userService.delete(userId);
        return ResponseFactory.ok("User deleted successfully.");
    }

private void verifyUserAccess(String requestedUserId) {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        
        AuthenticatedUser currentUser = (AuthenticatedUser) request.getAttribute(AuthRequestContext.AUTH_USER_ATTR);
        
        if (currentUser == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Security: Please log in first!");
        }

        if (requestedUserId.equals(currentUser.userId())) {
            return;
        }

        String roleName = String.valueOf(currentUser.roleId());
        if (roleName.contains("ADMIN")) {
            return; 
        }
        
        throw new AppException(ErrorCode.FORBIDDEN, "Security: You do not have permission to access other users' data!");
    }

    @PostMapping("/{userId}/avatar")
    public ResponseEntity<ApiResponse<String>> uploadAvatar(
            @PathVariable String userId,
            @RequestParam("file") MultipartFile file) {
            
        verifyUserAccess(userId); 

        String avatarUrl = mediaService.uploadAvatar(file);
        userService.updateAvatarUrl(userId, avatarUrl);
        return ResponseFactory.ok("Avatar uploaded successfully.", avatarUrl);
    }

    @GetMapping("/{userId}/notifications/preferences")
    public ResponseEntity<ApiResponse<UserNotificationPrefResponse>> getNotificationPreferences(
            @PathVariable String userId) {
            
        verifyUserAccess(userId);

        return ResponseFactory.ok(
                "Notification preferences retrieved.", 
                notificationPrefService.getPreferencesByUserId(userId)
        );
    }

    @PutMapping("/{userId}/notifications/preferences")
    public ResponseEntity<ApiResponse<UserNotificationPrefResponse>> updateNotificationPreferences(
            @PathVariable String userId,
            @Valid @RequestBody UpdateNotificationPrefRequest request) {
            
        verifyUserAccess(userId);

        return ResponseFactory.ok(
                "Notification preferences updated.", 
                notificationPrefService.updatePreferences(userId, request)
        );
    }

    @GetMapping("/{userId}/activities/logins")
    public ResponseEntity<ApiResponse<List<LoginHistoryResponse>>> getLoginHistories(
            @PathVariable String userId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        verifyUserAccess(userId); 
            
        return ResponseFactory.ok(
                "Login histories retrieved successfully.", 
                activityService.getLoginHistories(userId, pageable)
        );
    }
}
package com.fluxboard.user.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.rbac.annotation.RequirePermission;
import com.fluxboard.user.dto.request.CreateUserRequest;
import com.fluxboard.user.dto.request.UpdateUserRequest;
import com.fluxboard.user.dto.response.UserResponse;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
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
}

package com.fluxboard.user.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.user.dto.request.UserCreateRequest;
import com.fluxboard.user.dto.request.UserUpdateRequest;
import com.fluxboard.user.dto.response.UserResponse;
import com.fluxboard.user.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(@RequestBody UserCreateRequest request) {
        UserResponse createdUser = userService.create(request);
        return ResponseFactory.created("User created successfully", createdUser);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getById(@PathVariable String id) {
        UserResponse user = userService.getById(id);
        return ResponseFactory.ok("User retrieved successfully", user);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> getPage(Pageable pageable) {
        Page<UserResponse> page = userService.getPage(pageable);
        return ResponseFactory.paged("Users retrieved successfully", page);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> update(@PathVariable String id,
            @RequestBody UserUpdateRequest request) {
        UserResponse updatedUser = userService.update(id, request);
        return ResponseFactory.ok("User updated successfully", updatedUser);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        userService.delete(id);
        return ResponseFactory.ok("User deleted successfully");
    }
}
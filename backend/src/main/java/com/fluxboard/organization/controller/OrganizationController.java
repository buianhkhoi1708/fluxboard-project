package com.fluxboard.organization.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.organization.dto.response.OrganizationSearchResponse;
import com.fluxboard.organization.service.OrganizationService;
import com.fluxboard.rbac.annotation.RequirePermission;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/organizations")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @RequirePermission("DEPARTMENT_VIEW")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<OrganizationSearchResponse>>> searchPersonnel(@RequestParam String keyword) {
        return ResponseFactory.ok("Personnel searched successfully.", organizationService.searchPersonnel(keyword));
    }
}

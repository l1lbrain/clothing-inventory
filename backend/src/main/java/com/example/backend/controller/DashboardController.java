package com.example.backend.controller;

import com.example.backend.dto.response.DashboardResponseDto;
import com.example.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @PreAuthorize("hasAuthority('admin')")
    @GetMapping
    public ResponseEntity<DashboardResponseDto> getDashboardData() {
        DashboardResponseDto dashboardData = dashboardService.getParameterDashboard();
        return ResponseEntity.ok(dashboardData);
    }
}

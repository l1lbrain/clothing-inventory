package com.example.backend.controller;

import com.example.backend.dto.request.UserRoleUpdateRequestDto;
import com.example.backend.dto.request.UserUpdateRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.UserResponseDto;
import com.example.backend.model.enums.Status;
import com.example.backend.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("username", "fullName", "email", "createdAt", "status");

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<PageResponseDto<UserResponseDto>> getAllUsers(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "Page number must be greater than or equal to 1") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Status status,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        Pageable pageable = PageRequest.of(page - 1, 10, buildSort(sortBy, sortDirection));
        return ResponseEntity.ok(userService.getAllUsers(keyword, status, pageable));
    }

    @PatchMapping("/{uuid}")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<UserResponseDto> updateUser(
            @PathVariable String uuid,
            @Valid @RequestBody UserUpdateRequestDto request) {
        return ResponseEntity.ok(userService.updateUser(uuid, request));
    }

    @PutMapping("/{uuid}/roles")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<UserResponseDto> updateUserRoles(
            @PathVariable String uuid,
            @Valid @RequestBody UserRoleUpdateRequestDto request) {
        return ResponseEntity.ok(userService.updateUserRoles(uuid, request));
    }

    private Sort buildSort(String sortBy, String sortDir) {
        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, safeSortBy);
    }
}

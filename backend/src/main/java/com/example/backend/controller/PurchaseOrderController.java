package com.example.backend.controller;

import com.example.backend.dto.request.PurchaseOrderRequestDto;
import com.example.backend.dto.request.PurchaseOrderStatusUpdateRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.PurchaseOrderResponseDto;
import com.example.backend.model.enums.PurchaseOrderStatus;
import com.example.backend.service.PurchaseOrderService;
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

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
@Validated
public class PurchaseOrderController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("orderDate", "totalAmount", "receivedDate", "createdAt", "status", "totalQuantity");

    private final PurchaseOrderService purchaseOrderService;

    @PreAuthorize("hasAuthority('coordinator')")
    @GetMapping
    public ResponseEntity<PageResponseDto<PurchaseOrderResponseDto>> getAllPurchaseOrders(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "Page number must be greater than or equal to 1") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) PurchaseOrderStatus status,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {

        LocalDateTime from = parseDateTime(fromDate);
        LocalDateTime to   = parseDateTime(toDate);
        Pageable pageable = PageRequest.of(page - 1, 10, buildSort(sortBy, sortDirection));
        return ResponseEntity.ok(purchaseOrderService.getAllPurchaseOrders(keyword, status, from, to, pageable));
    }

    @PreAuthorize("hasAuthority('coordinator')")
    @GetMapping("/received")
    public ResponseEntity<PageResponseDto<PurchaseOrderResponseDto>> getReceivedPurchaseOrders(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "Page number must be greater than or equal to 1") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) PurchaseOrderStatus status,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {

        LocalDateTime from = parseDateTime(fromDate);
        LocalDateTime to   = parseDateTime(toDate);
        Pageable pageable = PageRequest.of(page - 1, 10, buildSort(sortBy, sortDirection));
        return ResponseEntity.ok(purchaseOrderService.getReceivedPurchaseOrders(keyword, status, from, to, pageable));
    }

    @PreAuthorize("hasAuthority('coordinator')")
    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponseDto> getPurchaseOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrderById(id));
    }

    @PreAuthorize("hasAuthority('coordinator')")
    @PostMapping
    public ResponseEntity<PurchaseOrderResponseDto> createPurchaseOrder(
            @Valid @RequestBody PurchaseOrderRequestDto request) {
        return ResponseEntity.ok(purchaseOrderService.createPurchaseOrder(request));
    }

    @PreAuthorize("hasAuthority('coordinator')")
    @PutMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponseDto> updatePurchaseOrder(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderRequestDto request) {
        return ResponseEntity.ok(purchaseOrderService.updatePurchaseOrder(id, request));
    }

    @PreAuthorize("hasAuthority('coordinator')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<PurchaseOrderResponseDto> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderStatusUpdateRequestDto request) {
        return ResponseEntity.ok(purchaseOrderService.updateStatus(id, request));
    }

    private Sort buildSort(String sortBy, String sortDir) {
        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, safeSortBy);
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDateTime.parse(raw);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
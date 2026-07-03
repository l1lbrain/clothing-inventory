package com.example.backend.controller;

import com.example.backend.dto.request.PurchaseOrderRequestDto;
import com.example.backend.dto.request.PurchaseOrderStatusUpdateRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.PurchaseOrderResponseDto;
import com.example.backend.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    /**
     * Tập hợp các field được phép sort — whitelist để tránh injection qua tham số
     * sortBy.
     */
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "orderDate", "totalAmount", "totalQuantity", "receivedDate");

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    public ResponseEntity<PageResponseDto<PurchaseOrderResponseDto>> getAllPurchaseOrders(
            @RequestParam(name = "page", defaultValue = "1") int pageNumber,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "sortBy", defaultValue = "orderDate") String sortBy,
            @RequestParam(name = "sortDir", defaultValue = "desc") String sortDir) {
        Pageable pageable = PageRequest.of(pageNumber - 1, 10, buildSort(sortBy, sortDir));
        return ResponseEntity.ok(purchaseOrderService.getAllPurchaseOrders(keyword, pageable));
    }

    @GetMapping("/received")
    public ResponseEntity<PageResponseDto<PurchaseOrderResponseDto>> getReceivedPurchaseOrders(
            @RequestParam(name = "page", defaultValue = "1") int pageNumber,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "sortBy", defaultValue = "orderDate") String sortBy,
            @RequestParam(name = "sortDir", defaultValue = "desc") String sortDir) {
        Pageable pageable = PageRequest.of(pageNumber - 1, 10, buildSort(sortBy, sortDir));
        return ResponseEntity.ok(purchaseOrderService.getReceivedPurchaseOrders(keyword, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponseDto> getPurchaseOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrderById(id));
    }

    @PostMapping
    public ResponseEntity<PurchaseOrderResponseDto> createPurchaseOrder(
            @Valid @RequestBody PurchaseOrderRequestDto request) {
        return ResponseEntity.ok(purchaseOrderService.createPurchaseOrder(request));
    }

    /** Sửa đơn đặt hàng — chỉ cho phép khi đơn ở trạng thái DRAFT */
    @PutMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponseDto> updatePurchaseOrder(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderRequestDto request) {
        return ResponseEntity.ok(purchaseOrderService.updatePurchaseOrder(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PurchaseOrderResponseDto> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderStatusUpdateRequestDto request) {
        return ResponseEntity.ok(purchaseOrderService.updateStatus(id, request));
    }

    /*
     * Xây dựng Sort từ tham số người dùng truyền vào.
     * Nếu sortBy không nằm trong whitelist → fallback về orderDate.
     * Nếu sortDir không phải "asc" → mặc định DESC.
     */
    private Sort buildSort(String sortBy, String sortDir) {
        String safeField = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "orderDate";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir)
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(direction, safeField);
    }
}
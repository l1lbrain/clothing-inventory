package com.example.backend.controller;

import com.example.backend.dto.request.PurchaseOrderRequestDto;
import com.example.backend.dto.request.PurchaseOrderStatusUpdateDto;
import com.example.backend.dto.response.PurchaseOrderResponseDto;
import com.example.backend.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    public ResponseEntity<List<PurchaseOrderResponseDto>> getAllPurchaseOrders() {
        return ResponseEntity.ok(purchaseOrderService.getAllPurchaseOrders());
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

    @PatchMapping("/{id}/status")
    public ResponseEntity<PurchaseOrderResponseDto> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderStatusUpdateDto request) {
        return ResponseEntity.ok(purchaseOrderService.updateStatus(id, request));
    }
}

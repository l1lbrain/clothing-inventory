package com.example.backend.controller;

import com.example.backend.dto.request.PaymentRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.PaymentResponseDto;
import com.example.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    public ResponseEntity<PaymentResponseDto> createPayment(@Valid @RequestBody PaymentRequestDto request) {
        PaymentResponseDto response = paymentService.createPayment(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PreAuthorize("hasAuthority('coordinator')")
    @GetMapping("/purchase-order/{purchaseOrderId}")
    public ResponseEntity<PageResponseDto<PaymentResponseDto>> getPaymentHistoryByPurchaseOrderId(
            @PathVariable Long purchaseOrderId,
            @RequestParam(name = "page", defaultValue = "1") int pageNumber) {
        Pageable pageable = PageRequest.of(pageNumber - 1, 10);
        PageResponseDto<PaymentResponseDto> response = paymentService.getPaymentHistoryByPurchaseOrderId(purchaseOrderId, pageable);
        return ResponseEntity.ok(response);
    }
}

package com.example.backend.controller;

import com.example.backend.dto.request.PaymentMethodRequestDto;
import com.example.backend.dto.response.PaymentMethodResponseDto;
import com.example.backend.service.PaymentMethodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payment-methods")
@RequiredArgsConstructor
public class PaymentMethodController {

    private final PaymentMethodService paymentMethodService;

    @PreAuthorize("hasAuthority('coordinator')")
    @GetMapping
    public ResponseEntity<List<PaymentMethodResponseDto>> getAllPaymentMethods() {
        return ResponseEntity.ok(paymentMethodService.getAllPaymentMethods());
    }

    @PostMapping
    public ResponseEntity<PaymentMethodResponseDto> createPaymentMethod(@Valid @RequestBody PaymentMethodRequestDto request) {
        return ResponseEntity.ok(paymentMethodService.createPaymentMethod(request));
    }
}

package com.example.backend.controller;

import com.example.backend.dto.request.TransactionSearchRequestDto;
import com.example.backend.dto.response.TransactionResponseDto;
import com.example.backend.service.InventoryTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory-transactions")
@RequiredArgsConstructor
public class InventoryTransactionController {

    private final InventoryTransactionService transactionService;

    @GetMapping("/search")
    public ResponseEntity<List<TransactionResponseDto>> searchTransactions(@Valid TransactionSearchRequestDto searchRequest) {
        List<TransactionResponseDto> response = transactionService.searchTransactions(searchRequest);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/variant/{variantId}")
    public ResponseEntity<List<TransactionResponseDto>> getHistoryByVariantId(@PathVariable Long variantId) {
        List<TransactionResponseDto> response = transactionService.getHistoryByVariantId(variantId);
        return ResponseEntity.ok(response);
    }
}
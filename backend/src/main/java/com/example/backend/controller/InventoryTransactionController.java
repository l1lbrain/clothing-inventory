package com.example.backend.controller;

import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.TransactionResponseDto;
import com.example.backend.service.InventoryTransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventory-transactions")
@RequiredArgsConstructor
public class InventoryTransactionController {

    private final InventoryTransactionService transactionService;

    @PreAuthorize("hasAuthority('coordinator')")
    @GetMapping
    public ResponseEntity<PageResponseDto<TransactionResponseDto>> getAllTransactions(
            @RequestParam(name = "page", defaultValue = "1") int pageNumber,
            @RequestParam(name = "keyword", required = false) String keyword) {
        Pageable pageable = PageRequest.of(pageNumber - 1, 10);
        PageResponseDto<TransactionResponseDto> response = transactionService.searchTransactions(keyword, pageable);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAuthority('coordinator')")
    @GetMapping("/variant/{variantId}")
    public ResponseEntity<PageResponseDto<TransactionResponseDto>> getHistoryByVariantId(
            @PathVariable Long variantId,
            @RequestParam(name = "page", defaultValue = "1") int pageNumber) {
        Pageable pageable = PageRequest.of(pageNumber - 1, 10);
        PageResponseDto<TransactionResponseDto> response = transactionService.getHistoryByVariantId(variantId, pageable);
        return ResponseEntity.ok(response);
    }
}
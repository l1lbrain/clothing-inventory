package com.example.backend.controller;

import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.TransactionResponseDto;
import com.example.backend.service.InventoryTransactionService;
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
@RequestMapping("/api/v1/inventory-transactions")
@RequiredArgsConstructor
@Validated
public class InventoryTransactionController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("createdAt", "quantity");

    private final InventoryTransactionService transactionService;

    @PreAuthorize("hasAuthority('coordinator')")
    @GetMapping
    public ResponseEntity<PageResponseDto<TransactionResponseDto>> getAllTransactions(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "Page number must be greater than or equal to 1") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        Pageable pageable = PageRequest.of(page - 1, 10, buildSort(sortBy, sortDirection));
        return ResponseEntity.ok(transactionService.searchTransactions(keyword, pageable));
    }

    @PreAuthorize("hasAuthority('warehouse-staff')")
    @GetMapping("/variant/{variantId}")
    public ResponseEntity<PageResponseDto<TransactionResponseDto>> getHistoryByVariantId(
            @PathVariable Long variantId,
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "Page number must be greater than or equal to 1") int page,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        Pageable pageable = PageRequest.of(page - 1, 10, buildSort(sortBy, sortDirection));
        return ResponseEntity.ok(transactionService.getHistoryByVariantId(variantId, pageable));
    }

    private Sort buildSort(String sortBy, String sortDir) {
        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, safeSortBy);
    }
}
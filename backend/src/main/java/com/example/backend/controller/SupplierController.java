package com.example.backend.controller;

import com.example.backend.dto.request.SupplierRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.SupplierResponseDto;
import com.example.backend.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    public ResponseEntity<PageResponseDto<SupplierResponseDto>> getAllSuppliers(
            @RequestParam(name = "page", defaultValue = "1") int pageNumber,
            @RequestParam(name = "keyword", required = false) String keyword) {
        Pageable pageable = PageRequest.of(pageNumber - 1, 10);
        return ResponseEntity.ok(supplierService.getAllSuppliers(keyword, pageable));
    }

    @PreAuthorize("hasAuthority('store-keeper')")
    @PostMapping
    public ResponseEntity<SupplierResponseDto> createSupplier(@Valid @RequestBody SupplierRequestDto request) {
        return ResponseEntity.ok(supplierService.createSupplier(request));
    }

    @PreAuthorize("hasAuthority('store-keeper')")
    @PutMapping("/{code}")
    public ResponseEntity<SupplierResponseDto> updateSupplier(@PathVariable String code, @Valid @RequestBody SupplierRequestDto request) {
        return ResponseEntity.ok(supplierService.updateSupplier(code, request));
    }

    @PreAuthorize("hasAuthority('store-keeper')")
    @PatchMapping("/{code}")
    public ResponseEntity<SupplierResponseDto> patchSupplier(@PathVariable String code, @RequestBody SupplierRequestDto request) {
        return ResponseEntity.ok(supplierService.updateSupplier(code, request));
    }

    @PreAuthorize("hasAuthority('store-keeper')")
    @DeleteMapping("/{code}")
    public ResponseEntity<Void> deleteSupplier(@PathVariable String code) {
        supplierService.deleteSupplier(code);
        return ResponseEntity.noContent().build();
    }
}
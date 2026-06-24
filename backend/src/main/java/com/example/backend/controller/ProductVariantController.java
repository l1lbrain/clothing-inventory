package com.example.backend.controller;

import com.example.backend.dto.request.VariantCreateRequestDto;
import com.example.backend.dto.request.VariantUpdateRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.VariantResponseDto;
import com.example.backend.service.ProductVariantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/variants")
@RequiredArgsConstructor
public class ProductVariantController {

    private final ProductVariantService variantService;

    @PostMapping
    public ResponseEntity<VariantResponseDto> createVariant(@Valid @RequestBody VariantCreateRequestDto request) {
        VariantResponseDto response = variantService.createVariant(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VariantResponseDto> updateVariant(
            @PathVariable Long id,
            @Valid @RequestBody VariantUpdateRequestDto request) {
        VariantResponseDto response = variantService.updateVariant(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VariantResponseDto> getVariantById(@PathVariable Long id) {
        VariantResponseDto response = variantService.getVariantById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<PageResponseDto<VariantResponseDto>> getAllVariants(
            @RequestParam(name = "page", defaultValue = "1") int pageNumber,
            @RequestParam(name = "keyword", required = false) String keyword) {
        Pageable pageable = PageRequest.of(pageNumber - 1, 10);
        PageResponseDto<VariantResponseDto> response = variantService.getAllVariants(keyword, pageable);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVariant(@PathVariable Long id) {
        variantService.deleteVariant(id);
        return ResponseEntity.noContent().build();
    }
}
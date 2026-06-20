package com.example.backend.controller;


import com.example.backend.dto.request.VariantCreateRequest;
import com.example.backend.dto.request.VariantUpdateRequest;
import com.example.backend.dto.response.VariantResponse;
import com.example.backend.service.ProductVariantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/variants")
@RequiredArgsConstructor
public class ProductVariantController {

    private final ProductVariantService variantService;

    @PostMapping
    public ResponseEntity<VariantResponse> createVariant(@Valid @RequestBody VariantCreateRequest request) {
        VariantResponse response = variantService.createVariant(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VariantResponse> updateVariant(
            @PathVariable Long id,
            @Valid @RequestBody VariantUpdateRequest request) {
        VariantResponse response = variantService.updateVariant(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VariantResponse> getVariantById(@PathVariable Long id) {
        VariantResponse response = variantService.getVariantById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<VariantResponse>> getAllVariants() {
        List<VariantResponse> response = variantService.getAllVariants();
        return ResponseEntity.ok(response);
    }
}
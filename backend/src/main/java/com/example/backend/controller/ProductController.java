package com.example.backend.controller;

import com.example.backend.dto.request.ProductCreateRequestDto;
import com.example.backend.dto.request.ProductUpdateRequestDto;
import com.example.backend.dto.request.VariantBulkPriceUpdateRequestDto;
import com.example.backend.dto.request.VariantDeleteRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.ProductResponseDto;
import com.example.backend.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<PageResponseDto<ProductResponseDto>> getAllProducts(
            @RequestParam(name = "page", defaultValue = "1") int pageNumber,
            @RequestParam(name = "keyword", required = false) String keyword) {
        Pageable pageable = PageRequest.of(pageNumber - 1, 10);
        return ResponseEntity.ok(productService.getAllProducts(keyword, pageable));
    }

    @PreAuthorize("hasAuthority('warehouse-staff')")
    @PostMapping
    public ResponseEntity<ProductResponseDto> createProduct(@Valid @RequestBody ProductCreateRequestDto request) {
        ProductResponseDto response = productService.createProduct(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PreAuthorize("hasAuthority('warehouse-staff')")
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponseDto> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductUpdateRequestDto request) {
        ProductResponseDto updatedProduct = productService.updateProduct(id, request);
        return ResponseEntity.ok(updatedProduct);
    }

    @PreAuthorize("hasAuthority('warehouse-staff')")
    @PutMapping("/variants/bulk-update-price")
    public ResponseEntity<List<ProductResponseDto>> bulkUpdateVariantPrices(@Valid @RequestBody VariantBulkPriceUpdateRequestDto request) {
        List<ProductResponseDto> affectedProducts = productService.bulkUpdateVariantPrices(request);
        return ResponseEntity.ok(affectedProducts);
    }

    @PreAuthorize("hasAuthority('warehouse-staff')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('warehouse-staff')")
    @DeleteMapping("/variants")
    public ResponseEntity<Void> deleteMultipleVariants(@Valid @RequestBody VariantDeleteRequestDto request) {
        productService.deleteMultipleVariants(request.getVariantIds());
        return ResponseEntity.noContent().build();
    }
}
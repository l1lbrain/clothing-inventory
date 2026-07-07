package com.example.backend.controller;

import com.example.backend.dto.request.*;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.ProductResponseDto;
import com.example.backend.dto.response.ProductVariantDetailResponseDto;
import com.example.backend.model.enums.Status;
import com.example.backend.service.ProductService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Validated
public class ProductController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("name", "brand", "createdAt", "updatedAt", "status", "sku", "quantityOnHand");

    private final ProductService productService;

    @PreAuthorize("hasAuthority('warehouse-staff')")
    @GetMapping
    public ResponseEntity<PageResponseDto<ProductResponseDto>> getAllProducts(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "Page number must be greater than or equal to 1") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Status status,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        Pageable pageable = PageRequest.of(page - 1, 10, buildSort(sortBy, sortDirection));
        return ResponseEntity.ok(productService.getAllProducts(keyword, status, pageable));
    }

    @PreAuthorize("hasAuthority('coordinator')")
    @GetMapping("/variants")
    public ResponseEntity<PageResponseDto<ProductVariantDetailResponseDto>> getAllVariants(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "Page number must be greater than or equal to 1") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Status status,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        Pageable pageable = PageRequest.of(page - 1, 10, buildSort(sortBy, sortDirection));
        return ResponseEntity.ok(productService.getAllVariants(keyword, status, pageable));
    }

    @PreAuthorize("hasAuthority('admin')")
    @GetMapping("/variants/low-stock")
    public ResponseEntity<PageResponseDto<ProductVariantDetailResponseDto>> getLowStockVariants(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "Page number must be greater than or equal to 1") int page,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Status status,
            @RequestParam(defaultValue = "quantityOnHand") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDirection) {

        Pageable pageable = PageRequest.of(page - 1, 10, buildSort(sortBy, sortDirection));
        return ResponseEntity.ok(productService.getLowStockVariants(keyword, status, pageable));
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
    @PutMapping("/variants/{id}")
    public ResponseEntity<ProductResponseDto> updateVariant(@PathVariable Long id, @Valid @RequestBody VariantUpdateRequestDto request) {
        ProductResponseDto updatedProduct = productService.updateVariant(id, request);
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

    private Sort buildSort(String sortBy, String sortDir) {
        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, safeSortBy);
    }
}

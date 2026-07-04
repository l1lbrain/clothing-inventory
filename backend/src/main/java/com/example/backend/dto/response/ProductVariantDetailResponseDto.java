package com.example.backend.dto.response;

import com.example.backend.model.enums.Status;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class ProductVariantDetailResponseDto {
    private Long variantId;
    private String sku;
    private BigDecimal purchasePrice;
    private BigDecimal salePrice;
    private Integer quantityOnHand;
    private Status status;

    private Long productId;
    private String productName;
    private String productCode;
    private String brand;
    private String description;
    private String imageUrl;
    private String unit;

    private String categoryName;

    private Map<String, String> attributes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package com.example.backend.dto.response;

import com.example.backend.model.enums.Status;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VariantResponseDto {
    private Long id;
    private Long productId;
    private String sku;
    private BigDecimal purchasePrice;
    private BigDecimal salePrice;
    private Integer quantityOnHand;
    private Status status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Map<String, String> attributes;
}
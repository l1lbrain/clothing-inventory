package com.example.backend.dto.response;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PurchaseOrderDetailResponseDto {
    private Long id;
    private Long variantId;
    private String sku;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;
}

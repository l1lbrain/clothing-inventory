package com.example.backend.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class TransactionResponseDto {
    private Long id;
    private Long variantId;
    private String sku;
    private Long purchaseOrderDetailId;
    private String purchaseOrderCode;
    private String transactionType;
    private Integer quantity;
    private Integer quantityBefore;
    private Integer quantityAfter;
    private String note;
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
}

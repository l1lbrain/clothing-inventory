package com.example.backend.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PurchaseOrderResponseDto {
    private Long id;
    private String code;
    private Long supplierId;
    private String supplierName;
    private Long createdById;
    private String createdByName;
    private LocalDateTime orderDate;
    private LocalDateTime receivedDate;
    private BigDecimal totalAmount;
    private Integer totalQuantity;

    private String paymentStatus;
    private String status;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PurchaseOrderDetailResponseDto> details;
}

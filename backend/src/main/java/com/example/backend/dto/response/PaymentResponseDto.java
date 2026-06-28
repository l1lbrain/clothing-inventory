package com.example.backend.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PaymentResponseDto {
    private Long id;
    private Long purchaseOrderId;
    private String purchaseOrderCode;
    private Long paymentMethodId;
    private String paymentMethodCode;
    private String paymentMethodName;
    private LocalDateTime paymentDate;
    private BigDecimal amount;
    private String note;
    private Long createdById;
    private String createdByName;
    private BigDecimal totalPaidAmount;
    private BigDecimal remainingAmount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

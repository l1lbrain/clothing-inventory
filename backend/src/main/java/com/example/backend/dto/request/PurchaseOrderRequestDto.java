package com.example.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class PurchaseOrderRequestDto {

    @NotBlank(message = "Purchase order code is required")
    @Size(max = 50, message = "Purchase order code must be at most 50 characters")
    private String code;

    @NotNull(message = "Supplier ID is required")
    private Long supplierId;

    @NotNull(message = "Order date is required")
    private LocalDateTime orderDate;

    private String note;

    @NotEmpty(message = "Purchase order must have at least one detail item")
    @Valid
    private List<PurchaseOrderDetailRequestDto> details;
}

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

    @NotBlank(message = "Purchase order code cannot be blank")
    @Size(max = 50, message = "Purchase order code cannot exceed 50 characters")
    private String code;

    @NotNull(message = "Supplier ID cannot be null")
    private Long supplierId;

    @NotNull(message = "Order date cannot be null")
    private LocalDateTime orderDate;

    private String note;

    @NotEmpty(message = "Details cannot be empty")
    @Valid
    private List<PurchaseOrderDetailRequestDto> details;
}
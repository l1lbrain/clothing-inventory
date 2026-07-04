package com.example.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class PurchaseOrderRequestDto {

    @NotBlank(message = "Code cannot be blank")
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
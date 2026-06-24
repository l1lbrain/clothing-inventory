package com.example.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryAdjustRequestDto {

    @NotNull(message = "Variant ID cannot be null")
    private Long variantId;

    @NotNull(message = "Adjust quantity cannot be null")
    private Integer adjustQuantity;

    private String note;

    @NotNull(message = "User ID cannot be null")
    private Long userId;
}
package com.example.backend.dto.request;

import com.example.backend.model.enums.Status;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class VariantBulkPriceUpdateRequestDto {

    @NotEmpty(message = "Variant IDs cannot be empty")
    private List<Long> variantIds;

    @PositiveOrZero(message = "Purchase price must be greater than or equal to 0")
    private BigDecimal purchasePrice;

    @PositiveOrZero(message = "Sale price must be greater than or equal to 0")
    private BigDecimal salePrice;

    private Status status;
}
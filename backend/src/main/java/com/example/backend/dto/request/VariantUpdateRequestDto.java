package com.example.backend.dto.request;

import com.example.backend.model.enums.Status;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class VariantUpdateRequestDto {

    @Size(max = 100, message = "Option 1 value cannot exceed 100 characters")
    private String option1Value;

    @Size(max = 100, message = "Option 2 value cannot exceed 100 characters")
    private String option2Value;

    @Size(max = 100, message = "Option 3 value cannot exceed 100 characters")
    private String option3Value;

    @PositiveOrZero(message = "Purchase price must be greater than or equal to 0")
    private BigDecimal purchasePrice;

    @PositiveOrZero(message = "Sale price must be greater than or equal to 0")
    private BigDecimal salePrice;

    @NotNull(message = "Status cannot be null")
    private Status status;

    @PositiveOrZero(message = "Quantity on hand must be greater than or equal to 0")
    private Integer quantityOnHand;

    @Size(max = 500, message = "Adjust reason cannot exceed 500 characters")
    private String adjustReason;
}

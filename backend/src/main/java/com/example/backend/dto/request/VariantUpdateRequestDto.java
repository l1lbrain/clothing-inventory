package com.example.backend.dto.request;

import com.example.backend.model.enums.Status;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VariantUpdateRequestDto {

    @Size(max = 100, message = "Option 1 value cannot exceed 100 characters")
    private String option1Value;

    @Size(max = 100, message = "Option 2 value cannot exceed 100 characters")
    private String option2Value;

    @Size(max = 100, message = "Option 3 value cannot exceed 100 characters")
    private String option3Value;

    @NotNull(message = "Purchase price cannot be null")
    @PositiveOrZero(message = "Purchase price must be greater than or equal to 0")
    private BigDecimal purchasePrice;

    @NotNull(message = "Sale price cannot be null")
    @PositiveOrZero(message = "Sale price must be greater than or equal to 0")
    private BigDecimal salePrice;

    @NotNull(message = "Status cannot be null")
    private Status status;
}
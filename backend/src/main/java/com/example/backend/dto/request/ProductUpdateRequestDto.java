package com.example.backend.dto.request;

import com.example.backend.model.enums.Status;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ProductUpdateRequestDto {

    @Size(max = 255, message = "Product name cannot exceed 255 characters")
    private String name;

    private Long categoryId;

    @Size(max = 255, message = "Brand cannot exceed 255 characters")
    private String brand;

    @Size(max = 50, message = "Unit cannot exceed 50 characters")
    private String unit;

    private String description;
    private Status status;

    private String option1Name;
    private String option2Name;
    private String option3Name;

    @NotEmpty(message = "Product must have at least one variant")
    @Valid
    private List<VariantUpdateItem> variants;

    @Data
    public static class VariantUpdateItem {
        private Long id;

        @Size(max = 100, message = "SKU cannot exceed 100 characters")
        private String sku;

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

        private Status status;
    }
}

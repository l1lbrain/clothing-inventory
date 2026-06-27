package com.example.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ProductCreateRequestDto {
    @NotBlank(message = "Product name cannot be blank")
    @Size(max = 255, message = "Product name cannot exceed 255 characters")
    private String name;

    private Long categoryId;
    private String brand;

    @Size(max = 50, message = "Unit cannot exceed 50 characters")
    private String unit;

    private String description;
    private String imageUrl;

    private String option1Name;
    private String option2Name;
    private String option3Name;

    @NotEmpty(message = "Product must have at least one variant")
    @Valid
    private List<VariantCreateRequestDto> variants;
}
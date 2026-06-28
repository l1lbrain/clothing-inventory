package com.example.backend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class VariantDeleteRequestDto {
    @NotEmpty(message = "Variant IDs cannot be empty")
    private List<Long> variantIds;
}

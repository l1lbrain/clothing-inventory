package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryResponseDto {
    private Long id;
    private Long variantId;
    private String sku;
    private Integer quantityOnHand;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Map<String, String> attributes;
}

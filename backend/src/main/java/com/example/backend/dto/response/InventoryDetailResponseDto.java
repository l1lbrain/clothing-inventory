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
public class InventoryDetailResponseDto {
    private Long inventoryId;
    private Long variantId;
    private String sku;
    private Integer quantityOnHand;
    private LocalDateTime lastUpdatedAt;

    // Thông tin gốc từ Product cha để hiển thị chi tiết lên UI kho hàng
    private Long productId;
    private String productName;
    private String brand;

    private Map<String, String> attributes;
}
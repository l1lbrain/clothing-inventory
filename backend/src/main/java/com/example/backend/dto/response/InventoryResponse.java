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
public class InventoryResponse {
    private Long id;
    private Long variantId;
    private String sku;
    private Integer quantityOnHand; // Số lượng thực tế trong kho hiện tại
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Kèm theo thuộc tính động để thủ kho nhìn là biết sản phẩm nào cụ thể
    private Map<String, String> attributes;
}

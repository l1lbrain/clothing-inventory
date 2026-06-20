package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VariantResponse {
    private Long id;
    private Long productId;
    private String sku;
    private BigDecimal purchasePrice;
    private BigDecimal salePrice;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Bản đồ thuộc tính động kết hợp từ tên (Product) và giá trị (Variant)
     * Ví dụ khi trả về: { "Màu sắc": "Đen", "Kích thước": "L" }
     */
    private Map<String, String> attributes;
}

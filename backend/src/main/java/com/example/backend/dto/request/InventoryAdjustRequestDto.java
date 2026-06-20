package com.example.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryAdjustRequestDto {

    @NotNull(message = "ID biến thể không được để trống")
    private Long variantId;

    @NotNull(message = "Số lượng thay đổi không được để trống")
    // Lưu ý: Không dùng @Min(0) ở đây vì số lượng có thể âm (khi xuất kho hoặc làm hao hụt kho)
    private Integer adjustQuantity;

    private String note;

    @NotNull(message = "ID người thực hiện không được để trống")
    private Long userId;
}
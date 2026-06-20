package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionResponse {
    private Long id;
    private Long variantId;
    private String sku;
    private Long purchaseOrderDetailId; // Sẽ có giá trị nếu dịch chuyển đến từ một Đơn mua hàng (PO)
    private String transactionType;      // IN (Nhập), OUT (Xuất), ADJUST (Điều chỉnh/Kiểm kê)
    private Integer quantity;            // Số lượng biến động của phiên giao dịch này (Luôn dương)
    private Integer quantityBefore;      // Số lượng tồn kho TRƯỚC khi dịch chuyển
    private Integer quantityAfter;       // Số lượng tồn kho SAU KHI dịch chuyển thành công
    private String note;                 // Ghi chú chi tiết lý do biến động
    private Long createdBy;              // ID nhân viên thực hiện
    private LocalDateTime createdAt;     // Thời gian giao dịch phát sinh
}

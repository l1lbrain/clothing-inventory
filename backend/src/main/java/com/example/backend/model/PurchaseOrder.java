package com.example.backend.model;

import com.example.backend.model.enums.PurchaseOrderStatus;
import com.example.backend.model.enums.PurchaseOrderPaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "purchase_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "order_date", nullable = false)
    private LocalDateTime orderDate;

    @Column(name = "received_date")
    private LocalDateTime receivedDate;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    /** Tổng số lượng sản phẩm đặt — tính từ subquery, read-only, dùng để sort. */
    @Formula("(SELECT COALESCE(SUM(pod.quantity), 0) FROM purchase_order_details pod WHERE pod.purchase_order_id = id)")
    private Integer totalQuantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 20)
    private PurchaseOrderPaymentStatus paymentStatus = PurchaseOrderPaymentStatus.UNPAID;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PurchaseOrderStatus status = PurchaseOrderStatus.DRAFT;

    @Column(columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

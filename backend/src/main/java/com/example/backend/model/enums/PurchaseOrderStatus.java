package com.example.backend.model.enums;

import lombok.Getter;

@Getter
public enum PurchaseOrderStatus {
    DRAFT("DRAFT"),      // Nháp
    PENDING("PENDING"),  // Chờ duyệt hoặc chờ giao
    RECEIVED("RECEIVED"); // Đã nhận hàng

    private final String value;

    PurchaseOrderStatus(String value) {
        this.value = value;
    }
}
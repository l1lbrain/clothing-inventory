package com.example.backend.model.enums;

import lombok.Getter;

@Getter
public enum PurchaseOrderPaymentStatus {
    UNPAID("UNPAID"),
    PARTIALLY_PAID("PARTIALLY_PAID"),
    PAID("PAID");

    private final String value;

    PurchaseOrderPaymentStatus(String value) {
        this.value = value;
    }
}

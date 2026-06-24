package com.example.backend.model.enums;

import lombok.Getter;

@Getter
public enum Status {
    ACTIVE("ACTIVE"),
    INACTIVE("INACTIVE");

    private final String value;

    Status(String value) {
        this.value = value;
    }
}

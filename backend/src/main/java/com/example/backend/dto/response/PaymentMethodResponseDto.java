package com.example.backend.dto.response;

import lombok.Data;

@Data
public class PaymentMethodResponseDto {
    private Long id;
    private String code;
    private String name;
    private String status;
}

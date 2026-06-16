package com.example.backend.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PaymentMethodResponseDto {
    private Long id;
    private String code;
    private String name;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PaymentMethodRequestDto {

    @NotBlank(message = "Payment method code is required")
    @Size(max = 50, message = "Payment method code must be at most 50 characters")
    private String code;

    @NotBlank(message = "Payment method name is required")
    @Size(max = 100, message = "Payment method name must be at most 100 characters")
    private String name;
}

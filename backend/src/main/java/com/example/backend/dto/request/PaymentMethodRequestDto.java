package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PaymentMethodRequestDto {

    @NotBlank(message = "Payment method code cannot be blank")
    @Size(max = 50, message = "Payment method code cannot exceed 50 characters")
    private String code;

    @NotBlank(message = "Payment method name cannot be blank")
    @Size(max = 100, message = "Payment method name cannot exceed 100 characters")
    private String name;
}
package com.example.backend.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class DashboardResponseDto {
    private BigDecimal totalAmount;
    private Long totalProduct;
    private Long totalSupplier;
    private Long totalInventory;

}

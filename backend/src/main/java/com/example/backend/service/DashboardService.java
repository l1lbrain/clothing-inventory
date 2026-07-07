package com.example.backend.service;

import com.example.backend.dto.response.DashboardResponseDto;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.ProductVariantRepository;
import com.example.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final ProductVariantRepository productVariantRepository;

    public DashboardResponseDto getParameterDashboard() {
        DashboardResponseDto dashboardResponseDto = new DashboardResponseDto();
        dashboardResponseDto.setTotalAmount(paymentRepository.sumAllAmount());
        dashboardResponseDto.setTotalProduct(productRepository.sumAllProduct());
        dashboardResponseDto.setTotalSupplier(supplierRepository.sumAllSupplier());
        dashboardResponseDto.setTotalInventory(productVariantRepository.sumAllQuantityOnHand());
        return dashboardResponseDto;
    }
}

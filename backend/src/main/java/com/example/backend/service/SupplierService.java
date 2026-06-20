package com.example.backend.service;

import com.example.backend.dto.request.SupplierRequestDto;
import com.example.backend.dto.response.SupplierResponseDto;
import com.example.backend.mapper.SupplierMapper;
import com.example.backend.model.Supplier;
import com.example.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierMapper supplierMapper;

    public List<SupplierResponseDto> getAllSuppliers() {
        return supplierRepository.findAll().stream()
                .map(supplierMapper::toResponse)
                .collect(Collectors.toList());
    }

    public SupplierResponseDto createSupplier(SupplierRequestDto request) {
        Supplier supplier = supplierMapper.toEntity(request);
        supplier.setStatus("ACTIVE");
        Supplier savedSupplier = supplierRepository.save(supplier);
        return supplierMapper.toResponse(savedSupplier);
    }
}

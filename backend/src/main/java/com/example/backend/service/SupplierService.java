package com.example.backend.service;

import com.example.backend.dto.request.SupplierRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.SupplierResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.SupplierMapper;
import com.example.backend.model.Supplier;
import com.example.backend.model.enums.Status;
import com.example.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierMapper supplierMapper;

    public PageResponseDto<SupplierResponseDto> getAllSuppliers(String keyword, Pageable pageable) {
        Page<Supplier> supplierPage;
        if (StringUtils.hasText(keyword)) {
            supplierPage = supplierRepository.search(keyword, pageable);
        } else {
            supplierPage = supplierRepository.findAll(pageable);
        }
        Page<SupplierResponseDto> dtoPage = supplierPage.map(supplierMapper::toResponse);
        return PageResponseDto.from(dtoPage);
    }

    public SupplierResponseDto getSupplierByCode(String code) {
        Supplier supplier = supplierRepository.findByCode(code)
                .orElseThrow(() -> new InvalidException(ErrorCode.SUPPLIER_NOT_FOUND));
        return supplierMapper.toResponse(supplier);
    }

    public SupplierResponseDto createSupplier(SupplierRequestDto request) {
        if (StringUtils.hasText(request.getEmail()) && supplierRepository.existsByEmail(request.getEmail())) {
            throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_EMAIL);
        }
        if (StringUtils.hasText(request.getPhone()) && supplierRepository.existsByPhone(request.getPhone())) {
            throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_PHONE);
        }
        if (StringUtils.hasText(request.getTaxCode()) && supplierRepository.existsByTaxCode(request.getTaxCode())) {
            throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_TAX_CODE);
        }

        Supplier supplier = supplierMapper.toEntity(request);

        supplier.setCode(generateUniqueSupplierCode());

        supplier.setStatus(Status.ACTIVE);
        Supplier savedSupplier = supplierRepository.save(supplier);
        return supplierMapper.toResponse(savedSupplier);
    }

    public SupplierResponseDto updateSupplier(String code, SupplierRequestDto request) {
        Supplier existingSupplier = supplierRepository.findByCode(code)
                .orElseThrow(() -> new InvalidException(ErrorCode.SUPPLIER_NOT_FOUND));

        if (request.getEmail() != null && !request.getEmail().equals(existingSupplier.getEmail()) && supplierRepository.existsByEmail(request.getEmail())) {
            throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_EMAIL);
        }
        if (request.getPhone() != null && !request.getPhone().equals(existingSupplier.getPhone()) && supplierRepository.existsByPhone(request.getPhone())) {
            throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_PHONE);
        }
        if (request.getTaxCode() != null && !request.getTaxCode().equals(existingSupplier.getTaxCode()) && supplierRepository.existsByTaxCode(request.getTaxCode())) {
            throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_TAX_CODE);
        }

        supplierMapper.updateEntity(request, existingSupplier);
        Supplier updatedSupplier = supplierRepository.save(existingSupplier);
        return supplierMapper.toResponse(updatedSupplier);
    }

    public void deleteSupplier(String code) {
        Supplier supplier = supplierRepository.findByCode(code)
                .orElseThrow(() -> new InvalidException(ErrorCode.SUPPLIER_NOT_FOUND));
        supplierRepository.delete(supplier);
    }

    private String generateUniqueSupplierCode() {
        String newCode;
        do {
            String datePart = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("yyMMdd"));
            String randomPart = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            newCode = "NCC-" + datePart + "-" + randomPart;
        } while (supplierRepository.existsByCode(newCode));
        return newCode;
    }
}
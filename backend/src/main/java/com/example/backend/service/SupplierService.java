package com.example.backend.service;

import com.example.backend.dto.request.SupplierRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.SupplierResponseDto;
import com.example.backend.dto.response.SupplierSimpleResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.SupplierMapper;
import com.example.backend.model.Supplier;
import com.example.backend.model.enums.Status;
import com.example.backend.repository.SupplierRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierMapper supplierMapper;

    public PageResponseDto<SupplierResponseDto> getAllSuppliers(String keyword, Status status, Pageable pageable) {
        Specification<Supplier> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.notEqual(root.get("status"), Status.DELETED));
            if (StringUtils.hasText(keyword)) {
                String keywordLower = "%" + keyword.toLowerCase() + "%";
                Predicate codePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("code")), keywordLower);
                Predicate namePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), keywordLower);
                Predicate emailPredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), keywordLower);
                Predicate phonePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("phone")), keywordLower);
                predicates.add(criteriaBuilder.or(codePredicate, namePredicate, emailPredicate, phonePredicate));
            }
            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
        Page<Supplier> supplierPage = supplierRepository.findAll(spec, pageable);
        return PageResponseDto.from(supplierPage.map(supplierMapper::toResponse));
    }

    public List<SupplierSimpleResponseDto> getAllSuppliersSimpleList() {
        return supplierRepository.findAll().stream()
                .map(supplierMapper::toSimpleResponse)
                .toList();
    }

    @Transactional
    public SupplierResponseDto createSupplier(SupplierRequestDto request) {
        if (StringUtils.hasText(request.getEmail())
                && supplierRepository.existsByEmailAndStatus(request.getEmail(), Status.ACTIVE)) {
            throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_EMAIL);
        }
        if (StringUtils.hasText(request.getPhone())
                && supplierRepository.existsByPhoneAndStatus(request.getPhone(), Status.ACTIVE)) {
            throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_PHONE);
        }
        if (StringUtils.hasText(request.getTaxCode())
                && supplierRepository.existsByTaxCodeAndStatus(request.getTaxCode(), Status.ACTIVE)) {
            throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_TAX_CODE);
        }
        Supplier supplier = supplierMapper.toEntity(request);
        supplier.setCode(generateUniqueSupplierCode());
        supplier.setStatus(Status.ACTIVE);
        Supplier savedSupplier = supplierRepository.save(supplier);
        return supplierMapper.toResponse(savedSupplier);
    }

    @Transactional
    public SupplierResponseDto updateSupplier(String code, SupplierRequestDto request) {
        Supplier existingSupplier = supplierRepository.findByCode(code)
                .orElseThrow(() -> new InvalidException(ErrorCode.SUPPLIER_NOT_FOUND));
        if (request.getName() != null) {
            existingSupplier.setName(request.getName());
        }
        if (request.getContactPerson() != null) {
            existingSupplier.setContactPerson(request.getContactPerson());
        }
        if (request.getPhone() != null) {
            if (supplierRepository.existsByPhoneAndStatusAndIdNot(request.getPhone(), Status.ACTIVE, existingSupplier.getId())) {
                throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_PHONE);
            }
            existingSupplier.setPhone(request.getPhone());
        }
        if (request.getEmail() != null) {
            if (supplierRepository.existsByEmailAndStatusAndIdNot(request.getEmail(), Status.ACTIVE, existingSupplier.getId())) {
                throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_EMAIL);
            }
            existingSupplier.setEmail(request.getEmail());
        }
        if (request.getAddress() != null) {
            existingSupplier.setAddress(request.getAddress());
        }
        if (request.getTaxCode() != null) {
            if (supplierRepository.existsByTaxCodeAndStatusAndIdNot(request.getTaxCode(), Status.ACTIVE, existingSupplier.getId())) {
                throw new InvalidException(ErrorCode.CONFLICT_SUPPLIER_TAX_CODE);
            }
            existingSupplier.setTaxCode(request.getTaxCode());
        }
        if (request.getNote() != null) {
            existingSupplier.setNote(request.getNote());
        }
        if (request.getStatus() != null) {
            existingSupplier.setStatus(request.getStatus());
        }
        return supplierMapper.toResponse(existingSupplier);
    }

    public SupplierResponseDto getSupplierById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.SUPPLIER_NOT_FOUND));
        return supplierMapper.toResponse(supplier);
    }

    @Transactional
    public void deleteSupplier(String code) {
        Supplier supplier = supplierRepository.findByCode(code)
                .orElseThrow(() -> new InvalidException(ErrorCode.SUPPLIER_NOT_FOUND));
        supplier.setStatus(Status.DELETED);
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

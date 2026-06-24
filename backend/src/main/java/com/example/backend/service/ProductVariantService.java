package com.example.backend.service;

import com.example.backend.dto.request.VariantCreateRequestDto;
import com.example.backend.dto.request.VariantUpdateRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.VariantResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.ProductVariantMapper;
import com.example.backend.model.Product;
import com.example.backend.model.ProductVariant;
import com.example.backend.model.enums.Status;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class ProductVariantService {

    private final ProductVariantRepository variantRepository;
    private final ProductRepository productRepository;
    private final ProductVariantMapper variantMapper;

    @Transactional
    public VariantResponseDto createVariant(VariantCreateRequestDto request) {
        if (variantRepository.existsBySku(request.getSku())) {
            throw new InvalidException(ErrorCode.SKU_ALREADY_EXISTS);
        }

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new InvalidException(ErrorCode.PRODUCT_NOT_FOUND));

        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku(request.getSku())
                .option1Value(request.getOption1Value())
                .option2Value(request.getOption2Value())
                .option3Value(request.getOption3Value())
                .purchasePrice(request.getPurchasePrice())
                .salePrice(request.getSalePrice())
                .quantityOnHand(0)
                .status(Status.ACTIVE)
                .build();

        ProductVariant savedVariant = variantRepository.save(variant);
        return variantMapper.toResponse(savedVariant);
    }

    @Transactional
    public VariantResponseDto updateVariant(Long id, VariantUpdateRequestDto request) {
        ProductVariant variant = variantRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.VARIANT_NOT_FOUND));

        variant.setOption1Value(request.getOption1Value());
        variant.setOption2Value(request.getOption2Value());
        variant.setOption3Value(request.getOption3Value());
        variant.setPurchasePrice(request.getPurchasePrice());
        variant.setSalePrice(request.getSalePrice());
        variant.setStatus(request.getStatus());

        ProductVariant updatedVariant = variantRepository.save(variant);
        return variantMapper.toResponse(updatedVariant);
    }

    public VariantResponseDto getVariantById(Long id) {
        ProductVariant variant = variantRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.VARIANT_NOT_FOUND));
        return variantMapper.toResponse(variant);
    }

    public PageResponseDto<VariantResponseDto> getAllVariants(String keyword, Pageable pageable) {
        Page<ProductVariant> variantPage;
        if (StringUtils.hasText(keyword)) {
            variantPage = variantRepository.search(keyword, pageable);
        } else {
            variantPage = variantRepository.findAll(pageable);
        }
        Page<VariantResponseDto> dtoPage = variantPage.map(variantMapper::toResponse);
        return PageResponseDto.from(dtoPage);
    }

    @Transactional
    public void deleteVariant(Long id) {
        if (!variantRepository.existsById(id)) {
            throw new InvalidException(ErrorCode.VARIANT_NOT_FOUND);
        }
        variantRepository.deleteById(id);
    }
}
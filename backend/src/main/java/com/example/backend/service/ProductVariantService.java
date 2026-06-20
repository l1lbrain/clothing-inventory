package com.example.backend.service;

import com.example.backend.dto.request.VariantCreateRequest;
import com.example.backend.dto.request.VariantUpdateRequest;
import com.example.backend.dto.response.VariantResponse;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.ProductVariantMapper;
import com.example.backend.model.*;
import com.example.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductVariantService {

    private final ProductVariantRepository variantRepository;
    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantMapper variantMapper;

    @Transactional
    public VariantResponse createVariant(VariantCreateRequest request) {
        if (variantRepository.existsBySku(request.getSku())) {
            throw new InvalidException(ErrorCode.SKU_ALREADY_EXISTS);
        }

        // 1. Tìm thực thể Product từ Database bằng ID từ Request
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND)); // Bạn có thể đổi thành PRODUCT_NOT_FOUND nếu có

        // 2. SỬA LỖI BUILDER: Truyền cả đối tượng `product` vào thay vì truyền ID lẻ
        ProductVariant variant = ProductVariant.builder()
                .product(product) // Đã sửa từ .productId(request.getProductId())
                .sku(request.getSku())
                .option1Value(request.getOption1Value())
                .option2Value(request.getOption2Value())
                .option3Value(request.getOption3Value())
                .purchasePrice(request.getPurchasePrice())
                .salePrice(request.getSalePrice())
                .status("ACTIVE")
                .build();

        ProductVariant savedVariant = variantRepository.save(variant);

        Inventory inventory = Inventory.builder()
                .variant(savedVariant)
                .quantityOnHand(0)
                .build();
        inventoryRepository.save(inventory);

        return variantMapper.toResponse(savedVariant, product);
    }

    @Transactional
    public VariantResponse updateVariant(Long id, VariantUpdateRequest request) {
        ProductVariant variant = variantRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.VARIANT_NOT_FOUND));

        // SỬA LỖI: Lấy trực tiếp đối tượng Product từ mối quan hệ JPA có sẵn trong variant
        Product product = variant.getProduct();

        variant.setOption1Value(request.getOption1Value());
        variant.setOption2Value(request.getOption2Value());
        variant.setOption3Value(request.getOption3Value());
        variant.setPurchasePrice(request.getPurchasePrice());
        variant.setSalePrice(request.getSalePrice());
        variant.setStatus(request.getStatus());

        return variantMapper.toResponse(variantRepository.save(variant), product);
    }

    public VariantResponse getVariantById(Long id) {
        ProductVariant variant = variantRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.VARIANT_NOT_FOUND));

        // SỬA LỖI: Lấy trực tiếp đối tượng Product từ variant
        Product product = variant.getProduct();
        return variantMapper.toResponse(variant, product);
    }

    public List<VariantResponse> getAllVariants() {
        return variantRepository.findAll().stream().map(variant -> {
            // SỬA LỖI: Tận dụng quan hệ Lazy loading để lấy Product, tránh loop Repo tìm ID liên tục
            Product product = variant.getProduct();
            if (product == null) {
                product = new Product();
            }
            return variantMapper.toResponse(variant, product);
        }).collect(Collectors.toList());
    }
}

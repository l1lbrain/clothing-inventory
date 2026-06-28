package com.example.backend.service;

import com.example.backend.dto.request.ProductCreateRequestDto;
import com.example.backend.dto.request.ProductUpdateRequestDto;
import com.example.backend.dto.request.VariantBulkPriceUpdateRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.ProductResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.ProductMapper;
import com.example.backend.model.Category;
import com.example.backend.model.Product;
import com.example.backend.model.ProductVariant;
import com.example.backend.model.enums.Status;
import com.example.backend.repository.CategoryRepository;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.ProductVariantRepository;
import com.example.backend.repository.PurchaseOrderDetailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final CategoryRepository categoryRepository;
    private final PurchaseOrderDetailRepository purchaseOrderDetailRepository;
    private final ProductMapper productMapper;

    public PageResponseDto<ProductResponseDto> getAllProducts(String keyword, Pageable pageable) {
        Page<Product> productPage;
        if (StringUtils.hasText(keyword)) {
            productPage = productRepository.search(keyword, pageable);
        } else {
            productPage = productRepository.findAll(pageable);
        }
        Page<ProductResponseDto> dtoPage = productPage.map(productMapper::toResponse);
        return PageResponseDto.from(dtoPage);
    }

    @Transactional
    public ProductResponseDto createProduct(ProductCreateRequestDto request) {
        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new InvalidException(ErrorCode.CATEGORY_NOT_FOUND));
        }

        Product product = productMapper.toEntity(request);
        product.setCategory(category);
        product.setStatus(Status.ACTIVE);
        product.setCode(generateUniqueProductCode());

        List<ProductVariant> variants = request.getVariants().stream().map(variantDto -> {
            String sku = generateSku(product.getCode(), variantDto.getOption1Value(), variantDto.getOption2Value(), variantDto.getOption3Value());
            return ProductVariant.builder()
                    .product(product)
                    .sku(sku)
                    .option1Value(variantDto.getOption1Value())
                    .option2Value(variantDto.getOption2Value())
                    .option3Value(variantDto.getOption3Value())
                    .purchasePrice(variantDto.getPurchasePrice())
                    .salePrice(variantDto.getSalePrice())
                    .quantityOnHand(0)
                    .status(Status.ACTIVE)
                    .build();
        }).toList();

        product.setVariants(variants);

        Product savedProduct = productRepository.save(product);
        return productMapper.toResponse(savedProduct);
    }

    @Transactional
    public ProductResponseDto updateProduct(Long id, ProductUpdateRequestDto request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PRODUCT_NOT_FOUND));

        updateProductFields(product, request);
        handleVariantUpdates(product, request.getVariants());
        syncParentStatus(product);

        return productMapper.toResponse(product);
    }

    private void updateProductFields(Product product, ProductUpdateRequestDto request) {
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new InvalidException(ErrorCode.CATEGORY_NOT_FOUND));
            product.setCategory(category);
        }
        if (request.getName() != null) product.setName(request.getName());
        if (request.getBrand() != null) product.setBrand(request.getBrand());
        if (request.getUnit() != null) product.setUnit(request.getUnit());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getOption1Name() != null) product.setOption1Name(request.getOption1Name());
        if (request.getOption2Name() != null) product.setOption2Name(request.getOption2Name());
        if (request.getOption3Name() != null) product.setOption3Name(request.getOption3Name());
        if (request.getStatus() != null) {
            product.setStatus(request.getStatus());
            product.getVariants().forEach(v -> v.setStatus(request.getStatus()));
        }
    }

    private void handleVariantUpdates(Product product, List<ProductUpdateRequestDto.VariantUpdateItem> variantItems) {
        Map<Long, ProductVariant> existingVariantsMap = product.getVariants().stream()
                .collect(Collectors.toMap(ProductVariant::getId, Function.identity()));

        Set<Long> requestVariantIds = variantItems.stream()
                .map(ProductUpdateRequestDto.VariantUpdateItem::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        deleteRemovedVariants(product, existingVariantsMap, requestVariantIds);
        createOrUpdateVariants(product, variantItems, existingVariantsMap);
    }

    private void deleteRemovedVariants(Product product, Map<Long, ProductVariant> existingVariantsMap, Set<Long> requestVariantIds) {
        List<ProductVariant> variantsToDelete = existingVariantsMap.values().stream()
                .filter(variant -> !requestVariantIds.contains(variant.getId()))
                .toList();

        for (ProductVariant variant : variantsToDelete) {
            if (purchaseOrderDetailRepository.existsByVariantId(variant.getId())) {
                throw new InvalidException(ErrorCode.CANNOT_DELETE_VARIANT_HAS_TRANSACTIONS);
            }
            product.getVariants().remove(variant);
        }
    }

    private void createOrUpdateVariants(Product product, List<ProductUpdateRequestDto.VariantUpdateItem> variantItems, Map<Long, ProductVariant> existingVariantsMap) {
        for (ProductUpdateRequestDto.VariantUpdateItem item : variantItems) {
            if (item.getId() == null) {
                createNewVariant(product, item);
            } else {
                updateExistingVariant(product, item, existingVariantsMap.get(item.getId()));
            }
        }
    }

    private void createNewVariant(Product product, ProductUpdateRequestDto.VariantUpdateItem item) {
        String sku = generateSku(product.getCode(), item.getOption1Value(), item.getOption2Value(), item.getOption3Value());
        ProductVariant newVariant = ProductVariant.builder()
                .product(product)
                .sku(sku)
                .option1Value(item.getOption1Value())
                .option2Value(item.getOption2Value())
                .option3Value(item.getOption3Value())
                .purchasePrice(item.getPurchasePrice())
                .salePrice(item.getSalePrice())
                .quantityOnHand(0)
                .status(item.getStatus() != null ? item.getStatus() : Status.ACTIVE)
                .build();
        product.getVariants().add(newVariant);
    }

    private void updateExistingVariant(Product product, ProductUpdateRequestDto.VariantUpdateItem item, ProductVariant existingVariant) {
        if (existingVariant == null) {
            throw new InvalidException(ErrorCode.VARIANT_NOT_FOUND);
        }

        boolean hasTransactions = purchaseOrderDetailRepository.existsByVariantId(existingVariant.getId());

        if (hasTransactions) {
            if (item.getPurchasePrice() != null) existingVariant.setPurchasePrice(item.getPurchasePrice());
            if (item.getSalePrice() != null) existingVariant.setSalePrice(item.getSalePrice());
            if (item.getStatus() != null) existingVariant.setStatus(item.getStatus());
        } else {
            updateVariantFreely(product, item, existingVariant);
        }
    }

    private void updateVariantFreely(Product product, ProductUpdateRequestDto.VariantUpdateItem item, ProductVariant existingVariant) {
        existingVariant.setOption1Value(item.getOption1Value());
        existingVariant.setOption2Value(item.getOption2Value());
        existingVariant.setOption3Value(item.getOption3Value());
        if (item.getPurchasePrice() != null) existingVariant.setPurchasePrice(item.getPurchasePrice());
        if (item.getSalePrice() != null) existingVariant.setSalePrice(item.getSalePrice());
        if (item.getStatus() != null) existingVariant.setStatus(item.getStatus());

        String newSku = generateSku(product.getCode(), item.getOption1Value(), item.getOption2Value(), item.getOption3Value());
        if (!newSku.equals(existingVariant.getSku())) {
            if (variantRepository.existsBySku(newSku)) {
                throw new InvalidException(ErrorCode.SKU_ALREADY_EXISTS);
            }
            existingVariant.setSku(newSku);
        }
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PRODUCT_NOT_FOUND));

        boolean hasTransactions = product.getVariants().stream()
                .anyMatch(variant -> purchaseOrderDetailRepository.existsByVariantId(variant.getId()));

        if (hasTransactions) {
            throw new InvalidException(ErrorCode.CANNOT_DELETE_PRODUCT_HAS_TRANSACTIONS);
        }
        productRepository.delete(product);
    }

    @Transactional
    public void deleteMultipleVariants(List<Long> variantIds) {
        if (variantIds == null || variantIds.isEmpty()) {
            return;
        }
        for (Long variantId : variantIds) {
            if (purchaseOrderDetailRepository.existsByVariantId(variantId)) {
                throw new InvalidException(ErrorCode.CANNOT_DELETE_VARIANT_HAS_TRANSACTIONS);
            }
        }
        variantRepository.deleteAllByIdInBatch(variantIds);
    }

    @Transactional
    public List<ProductResponseDto> bulkUpdateVariantPrices(VariantBulkPriceUpdateRequestDto request) {
        if (request.getPurchasePrice() == null && request.getSalePrice() == null && request.getStatus() == null) {
            return List.of();
        }
        for (Long variantId : request.getVariantIds()) {
            if (purchaseOrderDetailRepository.existsByVariantId(variantId)) {
                throw new InvalidException(ErrorCode.CANNOT_UPDATE_VARIANT_HAS_TRANSACTIONS);
            }
        }
        List<ProductVariant> variantsToUpdate = variantRepository.findAllById(request.getVariantIds());
        if (variantsToUpdate.size() != request.getVariantIds().size()) {
            throw new InvalidException(ErrorCode.VARIANT_NOT_FOUND);
        }
        Set<Product> affectedProducts = variantsToUpdate.stream()
                .map(ProductVariant::getProduct)
                .collect(Collectors.toSet());
        for (ProductVariant variant : variantsToUpdate) {
            if (request.getPurchasePrice() != null) variant.setPurchasePrice(request.getPurchasePrice());
            if (request.getSalePrice() != null) variant.setSalePrice(request.getSalePrice());
            if (request.getStatus() != null) variant.setStatus(request.getStatus());
        }
        affectedProducts.forEach(this::syncParentStatus);
        return affectedProducts.stream()
                .map(productMapper::toResponse)
                .toList();
    }

    private void syncParentStatus(Product product) {
        boolean allVariantsInactive = product.getVariants().stream()
                .allMatch(v -> v.getStatus() == Status.INACTIVE);
        if (allVariantsInactive) {
            product.setStatus(Status.INACTIVE);
        } else {
            product.setStatus(Status.ACTIVE);
        }
    }

    private String generateUniqueProductCode() {
        String newCode;
        do {
            String datePart = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("yyMMdd"));
            String randomPart = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            newCode = "SP-" + datePart + "-" + randomPart;
        } while (productRepository.existsByCode(newCode));
        return newCode;
    }

    private String generateSku(String productCode, String... options) {
        StringBuilder skuBuilder = new StringBuilder(productCode);
        for (String option : options) {
            if (StringUtils.hasText(option)) {
                skuBuilder.append("-").append(slugify(option));
            }
        }
        return skuBuilder.toString().toUpperCase();
    }

    private String slugify(String text) {
        if (!StringUtils.hasText(text)) {
            return "";
        }
        String nfdNormalizedString = Normalizer.normalize(text, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(nfdNormalizedString).replaceAll("")
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-");
    }
}
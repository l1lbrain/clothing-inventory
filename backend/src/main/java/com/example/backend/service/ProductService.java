package com.example.backend.service;

import com.example.backend.dto.request.ProductCreateRequestDto;
import com.example.backend.dto.request.ProductUpdateRequestDto;
import com.example.backend.dto.request.VariantBulkPriceUpdateRequestDto;
import com.example.backend.dto.request.VariantUpdateRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.ProductResponseDto;
import com.example.backend.dto.response.ProductVariantDetailResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.ProductMapper;
import com.example.backend.mapper.ProductVariantMapper;
import com.example.backend.model.*;
import com.example.backend.model.enums.Status;
import com.example.backend.repository.*;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
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

    private static final String TRANSACTION_TYPE_ADJUSTMENT = "ADJUSTMENT";

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final CategoryRepository categoryRepository;
    private final PurchaseOrderDetailRepository purchaseOrderDetailRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final UserRepository userRepository;
    private final ProductMapper productMapper;
    private final ProductVariantMapper variantMapper;

    public PageResponseDto<ProductResponseDto> getAllProducts(String keyword, Status status, Pageable pageable) {
        Specification<Product> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.notEqual(root.get("status"), Status.DELETED));
            if (StringUtils.hasText(keyword)) {
                String keywordLower = "%" + keyword.toLowerCase() + "%";
                Predicate codePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("code")), keywordLower);
                Predicate namePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), keywordLower);
                predicates.add(criteriaBuilder.or(codePredicate, namePredicate));
            }
            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
        Page<Product> productPage = productRepository.findAll(spec, pageable);
        return PageResponseDto.from(productPage.map(productMapper::toResponse));
    }

    public PageResponseDto<ProductVariantDetailResponseDto> getAllVariants(String keyword, Status status,
            Pageable pageable) {
        Specification<ProductVariant> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.notEqual(root.get("status"), Status.DELETED));

            if (StringUtils.hasText(keyword)) {
                String keywordLower = "%" + keyword.toLowerCase() + "%";
                Join<ProductVariant, Product> product = root.join("product");
                Predicate skuPredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("sku")), keywordLower);
                Predicate productNamePredicate = criteriaBuilder.like(criteriaBuilder.lower(product.get("name")),
                        keywordLower);
                predicates.add(criteriaBuilder.or(skuPredicate, productNamePredicate));
            }

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<ProductVariant> variantPage = variantRepository.findAll(spec, pageable);
        return PageResponseDto.from(variantPage.map(variantMapper::toDetailResponse));
    }

    public PageResponseDto<ProductVariantDetailResponseDto> getLowStockVariants(String keyword, Status status, Pageable pageable) {
        Specification<ProductVariant> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(criteriaBuilder.lessThan(root.get("quantityOnHand"), 20));
            predicates.add(criteriaBuilder.notEqual(root.get("status"), Status.DELETED));

            if (StringUtils.hasText(keyword)) {
                String keywordLower = "%" + keyword.toLowerCase() + "%";
                Join<ProductVariant, Product> product = root.join("product");
                Predicate skuPredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("sku")), keywordLower);
                Predicate productNamePredicate = criteriaBuilder.like(criteriaBuilder.lower(product.get("name")), keywordLower);
                predicates.add(criteriaBuilder.or(skuPredicate, productNamePredicate));
            }

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<ProductVariant> variantPage = variantRepository.findAll(spec, pageable);
        return PageResponseDto.from(variantPage.map(variantMapper::toDetailResponse));
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
            String sku = generateSku(product.getCode(), variantDto.getOption1Value(), variantDto.getOption2Value(),
                    variantDto.getOption3Value());
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
        if (request.getName() != null)
            product.setName(request.getName());
        if (request.getBrand() != null)
            product.setBrand(request.getBrand());
        if (request.getUnit() != null)
            product.setUnit(request.getUnit());
        if (request.getDescription() != null)
            product.setDescription(request.getDescription());
        if (request.getOption1Name() != null)
            product.setOption1Name(request.getOption1Name());
        if (request.getOption2Name() != null)
            product.setOption2Name(request.getOption2Name());
        if (request.getOption3Name() != null)
            product.setOption3Name(request.getOption3Name());
        if (request.getStatus() != null && request.getStatus() != product.getStatus()) {
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
        deleteRemovedVariants(existingVariantsMap, requestVariantIds);
        createOrUpdateVariants(product, variantItems, existingVariantsMap);
    }

    private void deleteRemovedVariants(Map<Long, ProductVariant> existingVariantsMap, Set<Long> requestVariantIds) {
        List<ProductVariant> variantsToDelete = existingVariantsMap.values().stream()
                .filter(variant -> !requestVariantIds.contains(variant.getId()))
                .toList();
        for (ProductVariant variant : variantsToDelete) {
            variant.setStatus(Status.DELETED);
        }
    }

    private void createOrUpdateVariants(Product product, List<ProductUpdateRequestDto.VariantUpdateItem> variantItems,
            Map<Long, ProductVariant> existingVariantsMap) {
        for (ProductUpdateRequestDto.VariantUpdateItem item : variantItems) {
            if (item.getId() == null) {
                createNewVariant(product, item);
            } else {
                updateExistingVariant(product, item, existingVariantsMap.get(item.getId()));
            }
        }
    }

    private void createNewVariant(Product product, ProductUpdateRequestDto.VariantUpdateItem item) {
        String sku = generateSku(product.getCode(), item.getOption1Value(), item.getOption2Value(),
                item.getOption3Value());
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

    private void updateExistingVariant(Product product, ProductUpdateRequestDto.VariantUpdateItem item,
            ProductVariant existingVariant) {
        if (existingVariant == null) {
            throw new InvalidException(ErrorCode.VARIANT_NOT_FOUND);
        }
        boolean hasTransactions = purchaseOrderDetailRepository.existsByVariantId(existingVariant.getId());
        if (hasTransactions) {
            boolean optionsChanged = !Objects.equals(item.getOption1Value(), existingVariant.getOption1Value()) ||
                    !Objects.equals(item.getOption2Value(), existingVariant.getOption2Value()) ||
                    !Objects.equals(item.getOption3Value(), existingVariant.getOption3Value());
            if (optionsChanged) {
                throw new InvalidException(ErrorCode.CANNOT_UPDATE_VARIANT_HAS_TRANSACTIONS);
            }
            if (item.getPurchasePrice() != null)
                existingVariant.setPurchasePrice(item.getPurchasePrice());
            if (item.getSalePrice() != null)
                existingVariant.setSalePrice(item.getSalePrice());
            if (item.getStatus() != null)
                existingVariant.setStatus(item.getStatus());
        } else {
            updateVariantFreely(product, item, existingVariant);
        }
    }

    private void updateVariantFreely(Product product, ProductUpdateRequestDto.VariantUpdateItem item,
            ProductVariant existingVariant) {
        existingVariant.setOption1Value(item.getOption1Value());
        existingVariant.setOption2Value(item.getOption2Value());
        existingVariant.setOption3Value(item.getOption3Value());
        if (item.getPurchasePrice() != null)
            existingVariant.setPurchasePrice(item.getPurchasePrice());
        if (item.getSalePrice() != null)
            existingVariant.setSalePrice(item.getSalePrice());
        if (item.getStatus() != null)
            existingVariant.setStatus(item.getStatus());
        String newSku = generateSku(product.getCode(), item.getOption1Value(), item.getOption2Value(),
                item.getOption3Value());
        if (!newSku.equals(existingVariant.getSku())) {
            if (variantRepository.existsBySku(newSku)) {
                throw new InvalidException(ErrorCode.SKU_ALREADY_EXISTS);
            }
            existingVariant.setSku(newSku);
        }
    }

    @Transactional
    public ProductResponseDto updateVariant(Long variantId, VariantUpdateRequestDto request) {
        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new InvalidException(ErrorCode.VARIANT_NOT_FOUND));

        if (request.getPurchasePrice() != null)
            variant.setPurchasePrice(request.getPurchasePrice());
        if (request.getSalePrice() != null)
            variant.setSalePrice(request.getSalePrice());
        if (request.getStatus() != null)
            variant.setStatus(request.getStatus());

        boolean hasTransactions = purchaseOrderDetailRepository.existsByVariantId(variantId);
        if (hasTransactions) {
            boolean optionsChanged = !Objects.equals(request.getOption1Value(), variant.getOption1Value()) ||
                    !Objects.equals(request.getOption2Value(), variant.getOption2Value()) ||
                    !Objects.equals(request.getOption3Value(), variant.getOption3Value());
            if (optionsChanged) {
                throw new InvalidException(ErrorCode.CANNOT_UPDATE_VARIANT_HAS_TRANSACTIONS);
            }
        } else {
            variant.setOption1Value(request.getOption1Value());
            variant.setOption2Value(request.getOption2Value());
            variant.setOption3Value(request.getOption3Value());

            String newSku = generateSku(
                    variant.getProduct().getCode(),
                    request.getOption1Value(),
                    request.getOption2Value(),
                    request.getOption3Value());
            if (!newSku.equals(variant.getSku())) {
                if (variantRepository.existsBySku(newSku)) {
                    throw new InvalidException(ErrorCode.SKU_ALREADY_EXISTS);
                }
                variant.setSku(newSku);
            }
        }

        if (request.getQuantityOnHand() != null) {
            Integer quantityBefore = variant.getQuantityOnHand();
            Integer quantityAfter = request.getQuantityOnHand();

            if (!quantityBefore.equals(quantityAfter)) {
                variant.setQuantityOnHand(quantityAfter);

                User currentUser = getCurrentUser();
                InventoryTransaction transaction = InventoryTransaction.builder()
                        .variant(variant)
                        .purchaseOrderDetail(null)
                        .transactionType(TRANSACTION_TYPE_ADJUSTMENT)
                        .quantity(quantityAfter - quantityBefore)
                        .quantityBefore(quantityBefore)
                        .quantityAfter(quantityAfter)
                        .note(request.getAdjustReason())
                        .createdBy(currentUser)
                        .build();
                inventoryTransactionRepository.save(transaction);
            }
        }

        syncParentStatus(variant.getProduct());

        return productMapper.toResponse(variant.getProduct());
    }

    private User getCurrentUser() {
        String uuid = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUuid(uuid)
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PRODUCT_NOT_FOUND));
        product.setStatus(Status.DELETED);
        product.getVariants().forEach(variant -> variant.setStatus(Status.DELETED));
    }

    @Transactional
    public void deleteMultipleVariants(List<Long> variantIds) {
        if (variantIds == null || variantIds.isEmpty()) {
            return;
        }
        List<ProductVariant> variants = variantRepository.findAllById(variantIds);
        if (variants.size() != variantIds.size()) {
            throw new InvalidException(ErrorCode.VARIANT_NOT_FOUND);
        }
        Set<Product> affectedProducts = new HashSet<>();
        for (ProductVariant variant : variants) {
            variant.setStatus(Status.DELETED);
            affectedProducts.add(variant.getProduct());
        }
        affectedProducts.forEach(this::syncParentStatus);
    }

    @Transactional
    public List<ProductResponseDto> bulkUpdateVariantPrices(VariantBulkPriceUpdateRequestDto request) {
        if (request.getPurchasePrice() == null && request.getSalePrice() == null && request.getStatus() == null) {
            return List.of();
        }
        List<ProductVariant> variantsToUpdate = variantRepository.findAllById(request.getVariantIds());
        if (variantsToUpdate.size() != request.getVariantIds().size()) {
            throw new InvalidException(ErrorCode.VARIANT_NOT_FOUND);
        }
        Set<Product> affectedProducts = variantsToUpdate.stream()
                .map(ProductVariant::getProduct)
                .collect(Collectors.toSet());
        for (ProductVariant variant : variantsToUpdate) {
            if (purchaseOrderDetailRepository.existsByVariantId(variant.getId())) {
                throw new InvalidException(ErrorCode.CANNOT_UPDATE_VARIANT_HAS_TRANSACTIONS);
            }
            if (request.getPurchasePrice() != null)
                variant.setPurchasePrice(request.getPurchasePrice());
            if (request.getSalePrice() != null)
                variant.setSalePrice(request.getSalePrice());
            if (request.getStatus() != null)
                variant.setStatus(request.getStatus());
        }
        affectedProducts.forEach(this::syncParentStatus);
        return affectedProducts.stream()
                .map(productMapper::toResponse)
                .collect(Collectors.toList());
    }

    private void syncParentStatus(Product product) {
        boolean allVariantsInactive = product.getVariants().stream()
                .filter(v -> v.getStatus() != Status.DELETED)
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
            String datePart = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))
                    .format(DateTimeFormatter.ofPattern("yyMMdd"));
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

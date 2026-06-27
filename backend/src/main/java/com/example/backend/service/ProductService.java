package com.example.backend.service;

import com.example.backend.dto.request.ProductCreateRequestDto;
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
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final CategoryRepository categoryRepository;
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

    public ProductResponseDto getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PRODUCT_NOT_FOUND));
        return productMapper.toResponse(product);
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
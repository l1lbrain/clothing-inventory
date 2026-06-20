package com.example.backend.mapper;

import com.example.backend.dto.response.VariantResponseDto;
import com.example.backend.model.Product;
import com.example.backend.model.ProductVariant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.LinkedHashMap;
import java.util.Map;

@Mapper(componentModel = "spring")
public interface ProductVariantMapper {

    @Mapping(target = "id", source = "variant.id")
    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "status", source = "variant.status")
    @Mapping(target = "createdAt", source = "variant.createdAt")
    @Mapping(target = "updatedAt", source = "variant.updatedAt")
    @Mapping(target = "attributes", expression = "java(buildAttributes(product.getOption1Name(), variant.getOption1Value(), product.getOption2Name(), variant.getOption2Value(), product.getOption3Name(), variant.getOption3Value()))")
    VariantResponseDto toResponse(ProductVariant variant, Product product);

    // Hàm bổ trợ gom Map thuộc tính động dùng chung cho MapStruct
    default Map<String, String> buildAttributes(String n1, String v1, String n2, String v2, String n3, String v3) {
        Map<String, String> attrs = new LinkedHashMap<>();
        if (n1 != null && !n1.isBlank() && v1 != null && !v1.isBlank()) attrs.put(n1, v1);
        if (n2 != null && !n2.isBlank() && v2 != null && !v2.isBlank()) attrs.put(n2, v2);
        if (n3 != null && !n3.isBlank() && v3 != null && !v3.isBlank()) attrs.put(n3, v3);
        return attrs;
    }
}

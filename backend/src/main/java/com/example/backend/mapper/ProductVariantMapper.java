package com.example.backend.mapper;

import com.example.backend.dto.response.VariantResponseDto;
import com.example.backend.model.ProductVariant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.LinkedHashMap;
import java.util.Map;

@Mapper(componentModel = "spring")
public interface ProductVariantMapper {

    @Mapping(target = "productId", source = "variant.product.id")
    @Mapping(target = "attributes", expression = "java(buildAttributes(variant.getProduct().getOption1Name(), variant.getOption1Value(), variant.getProduct().getOption2Name(), variant.getOption2Value(), variant.getProduct().getOption3Name(), variant.getOption3Value()))")
    @Mapping(target = "hasTransactions", expression = "java(variant.getPurchaseOrderDetails() != null && !variant.getPurchaseOrderDetails().isEmpty())")
    VariantResponseDto toResponse(ProductVariant variant);

    default Map<String, String> buildAttributes(String n1, String v1, String n2, String v2, String n3, String v3) {
        Map<String, String> attrs = new LinkedHashMap<>();
        if (n1 != null && !n1.isBlank() && v1 != null && !v1.isBlank()) attrs.put(n1, v1);
        if (n2 != null && !n2.isBlank() && v2 != null && !v2.isBlank()) attrs.put(n2, v2);
        if (n3 != null && !n3.isBlank() && v3 != null && !v3.isBlank()) attrs.put(n3, v3);
        return attrs;
    }
}
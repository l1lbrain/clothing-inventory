package com.example.backend.mapper;

import com.example.backend.dto.response.InventoryDetailResponseDto;
import com.example.backend.dto.response.InventoryResponseDto;
import com.example.backend.model.Inventory;
import com.example.backend.model.Product;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.LinkedHashMap;
import java.util.Map;

@Mapper(componentModel = "spring")
public interface InventoryMapper {

    @Mapping(target = "id", source = "inventory.id")
    @Mapping(target = "createdAt", source = "inventory.createdAt")
    @Mapping(target = "updatedAt", source = "inventory.updatedAt")
    @Mapping(target = "variantId", source = "inventory.variant.id")
    @Mapping(target = "sku", source = "inventory.variant.sku")
    @Mapping(target = "attributes", expression = "java(buildAttributes(product.getOption1Name(), inventory.getVariant().getOption1Value(), product.getOption2Name(), inventory.getVariant().getOption2Value(), product.getOption3Name(), inventory.getVariant().getOption3Value()))")
    InventoryResponseDto toResponse(Inventory inventory, Product product);

    @Mapping(target = "inventoryId", source = "inventory.id")
    @Mapping(target = "variantId", source = "inventory.variant.id")
    @Mapping(target = "sku", source = "inventory.variant.sku")
    @Mapping(target = "lastUpdatedAt", source = "inventory.updatedAt")
    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "attributes", expression = "java(buildAttributes(product.getOption1Name(), inventory.getVariant().getOption1Value(), product.getOption2Name(), inventory.getVariant().getOption2Value(), product.getOption3Name(), inventory.getVariant().getOption3Value()))")
    InventoryDetailResponseDto toDetailResponse(Inventory inventory, Product product);

    default Map<String, String> buildAttributes(String n1, String v1, String n2, String v2, String n3, String v3) {
        Map<String, String> attrs = new LinkedHashMap<>();
        if (n1 != null && !n1.isBlank() && v1 != null && !v1.isBlank()) attrs.put(n1, v1);
        if (n2 != null && !n2.isBlank() && v2 != null && !v2.isBlank()) attrs.put(n2, v2);
        if (n3 != null && !n3.isBlank() && v3 != null && !v3.isBlank()) attrs.put(n3, v3);
        return attrs;
    }
}
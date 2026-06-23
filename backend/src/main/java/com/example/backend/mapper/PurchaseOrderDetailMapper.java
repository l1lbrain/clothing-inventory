package com.example.backend.mapper;

import com.example.backend.dto.request.PurchaseOrderDetailRequestDto;
import com.example.backend.dto.response.PurchaseOrderDetailResponseDto;
import com.example.backend.model.PurchaseOrderDetail;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PurchaseOrderDetailMapper {

    @Mapping(target = "variantId", source = "variant.id")
    @Mapping(target = "sku", source = "variant.sku")
    @Mapping(target = "lineTotal", expression = "java(detail.getUnitPrice().multiply(java.math.BigDecimal.valueOf(detail.getQuantity())))")
    PurchaseOrderDetailResponseDto toResponse(PurchaseOrderDetail detail);
}

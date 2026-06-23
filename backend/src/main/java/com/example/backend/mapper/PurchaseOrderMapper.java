package com.example.backend.mapper;

import com.example.backend.dto.response.PurchaseOrderResponseDto;
import com.example.backend.model.PurchaseOrder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {PurchaseOrderDetailMapper.class})
public interface PurchaseOrderMapper {

    @Mapping(target = "supplierId", source = "supplier.id")
    @Mapping(target = "supplierName", source = "supplier.name")
    @Mapping(target = "createdById", source = "createdBy.id")
    @Mapping(target = "createdByName", source = "createdBy.fullName")
    @Mapping(target = "details", ignore = true)
    PurchaseOrderResponseDto toResponse(PurchaseOrder purchaseOrder);
}

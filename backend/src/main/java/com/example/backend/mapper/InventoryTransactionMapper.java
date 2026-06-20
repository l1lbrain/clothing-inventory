package com.example.backend.mapper;

import com.example.backend.dto.response.TransactionResponseDto;
import com.example.backend.model.InventoryTransaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InventoryTransactionMapper {

    @Mapping(target = "variantId", source = "tx.variant.id")
    @Mapping(target = "sku", source = "tx.variant.sku")
    TransactionResponseDto toResponse(InventoryTransaction tx);
}
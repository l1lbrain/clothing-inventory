package com.example.backend.mapper;

import com.example.backend.dto.request.SupplierRequest;
import com.example.backend.dto.response.SupplierResponseDto;
import com.example.backend.model.Supplier;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SupplierMapper {
    Supplier toEntity(SupplierRequest request);

    SupplierResponseDto toResponse(Supplier supplier);
}

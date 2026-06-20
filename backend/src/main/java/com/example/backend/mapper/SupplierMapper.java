package com.example.backend.mapper;

import com.example.backend.dto.request.SupplierRequestDto;
import com.example.backend.dto.response.SupplierResponseDto;
import com.example.backend.model.Supplier;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SupplierMapper {
    Supplier toEntity(SupplierRequestDto request);

    SupplierResponseDto toResponse(Supplier supplier);
}

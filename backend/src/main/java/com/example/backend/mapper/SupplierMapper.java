package com.example.backend.mapper;

import com.example.backend.dto.request.SupplierRequest;
import com.example.backend.dto.response.SupplierResponse;
import com.example.backend.model.Supplier;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SupplierMapper {
    Supplier toEntity(SupplierRequest request);

    SupplierResponse toResponse(Supplier supplier);
}

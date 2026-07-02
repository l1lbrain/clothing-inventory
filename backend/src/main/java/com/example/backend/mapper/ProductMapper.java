package com.example.backend.mapper;

import com.example.backend.dto.request.ProductCreateRequestDto;
import com.example.backend.dto.response.ProductResponseDto;
import com.example.backend.model.Product;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {ProductVariantMapper.class})
public interface ProductMapper {

    @Mapping(target = "categoryName", source = "category.name")
    ProductResponseDto toResponse(Product product);

    @Mapping(target = "variants", ignore = true)
    Product toEntity(ProductCreateRequestDto request);
}
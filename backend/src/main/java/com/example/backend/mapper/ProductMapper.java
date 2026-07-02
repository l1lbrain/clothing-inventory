package com.example.backend.mapper;

import com.example.backend.dto.request.ProductCreateRequestDto;
import com.example.backend.dto.request.ProductUpdateRequestDto;
import com.example.backend.dto.response.ProductResponseDto;
import com.example.backend.model.Product;
import org.mapstruct.*;

@Mapper(componentModel = "spring", uses = {ProductVariantMapper.class})
public interface ProductMapper {

    @Mapping(target = "categoryName", source = "category.name")
    ProductResponseDto toResponse(Product product);

    @Mapping(target = "variants", ignore = true)
    Product toEntity(ProductCreateRequestDto request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "category", ignore = true)
    void updateEntity(ProductUpdateRequestDto request, @MappingTarget Product product);

    @Mapping(target = "category", ignore = true)
    void replaceEntity(ProductUpdateRequestDto request, @MappingTarget Product product);
}
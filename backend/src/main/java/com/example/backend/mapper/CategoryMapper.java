package com.example.backend.mapper;

import com.example.backend.dto.request.CategoryRequestDto;
import com.example.backend.dto.response.CategoryResponseDto;
import com.example.backend.model.Category;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CategoryMapper {
    Category toEntity(CategoryRequestDto request);

    CategoryResponseDto toResponse(Category category);
}

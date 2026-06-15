package com.example.backend.dto.response;

import org.springframework.data.domain.Page;

import java.util.List;

public record PageResponseDto<T>(List<T> items, int page, int size, long totalElements, int totalPages) {
    // thay hàm new
    public static <T> PageResponseDto<T> from(Page<T> page) {
        return new PageResponseDto<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}
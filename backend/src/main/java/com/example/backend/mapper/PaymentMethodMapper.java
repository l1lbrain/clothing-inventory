package com.example.backend.mapper;

import com.example.backend.dto.request.PaymentMethodRequestDto;
import com.example.backend.dto.response.PaymentMethodResponseDto;
import com.example.backend.model.PaymentMethod;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PaymentMethodMapper {
    PaymentMethod toEntity(PaymentMethodRequestDto request);

    PaymentMethodResponseDto toResponse(PaymentMethod paymentMethod);
}

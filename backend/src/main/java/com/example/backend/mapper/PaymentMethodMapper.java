package com.example.backend.mapper;

import com.example.backend.dto.request.PaymentMethodRequest;
import com.example.backend.dto.response.PaymentMethodResponse;
import com.example.backend.model.PaymentMethod;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PaymentMethodMapper {
    PaymentMethod toEntity(PaymentMethodRequest request);

    PaymentMethodResponse toResponse(PaymentMethod paymentMethod);
}

package com.example.backend.mapper;

import com.example.backend.dto.response.PaymentResponseDto;
import com.example.backend.model.Payment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PaymentMapper {

    @Mapping(target = "purchaseOrderId", source = "purchaseOrder.id")
    @Mapping(target = "purchaseOrderCode", source = "purchaseOrder.code")
    @Mapping(target = "paymentMethodId", source = "paymentMethod.id")
    @Mapping(target = "paymentMethodCode", source = "paymentMethod.code")
    @Mapping(target = "paymentMethodName", source = "paymentMethod.name")
    @Mapping(target = "createdById", source = "createdBy.id")
    @Mapping(target = "createdByName", source = "createdBy.fullName")
    @Mapping(target = "totalPaidAmount", ignore = true)
    @Mapping(target = "remainingAmount", ignore = true)
    PaymentResponseDto toResponse(Payment payment);
}

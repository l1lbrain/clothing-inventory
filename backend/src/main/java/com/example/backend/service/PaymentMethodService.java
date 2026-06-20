package com.example.backend.service;

import com.example.backend.dto.request.PaymentMethodRequestDto;
import com.example.backend.dto.response.PaymentMethodResponseDto;
import com.example.backend.mapper.PaymentMethodMapper;
import com.example.backend.model.PaymentMethod;
import com.example.backend.repository.PaymentMethodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentMethodService {

    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentMethodMapper paymentMethodMapper;

    public List<PaymentMethodResponseDto> getAllPaymentMethods() {
        return paymentMethodRepository.findAll().stream()
                .map(paymentMethodMapper::toResponse)
                .collect(Collectors.toList());
    }

    public PaymentMethodResponseDto createPaymentMethod(PaymentMethodRequestDto request) {
        PaymentMethod paymentMethod = paymentMethodMapper.toEntity(request);
        paymentMethod.setStatus("ACTIVE"); // Default status
        PaymentMethod savedPaymentMethod = paymentMethodRepository.save(paymentMethod);
        return paymentMethodMapper.toResponse(savedPaymentMethod);
    }
}

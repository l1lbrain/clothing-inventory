package com.example.backend.service;

import com.example.backend.dto.request.PaymentMethodRequestDto;
import com.example.backend.dto.response.PaymentMethodResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.PaymentMethodMapper;
import com.example.backend.model.PaymentMethod;
import com.example.backend.model.enums.Status;
import com.example.backend.repository.PaymentMethodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public PaymentMethodResponseDto getPaymentMethodById(Long id) {
        PaymentMethod paymentMethod = paymentMethodRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PAYMENT_METHOD_NOT_FOUND));
        return paymentMethodMapper.toResponse(paymentMethod);
    }

    @Transactional
    public PaymentMethodResponseDto createPaymentMethod(PaymentMethodRequestDto request) {
        if (paymentMethodRepository.existsByCode(request.getCode())) {
            throw new InvalidException(ErrorCode.CONFLICT_PAYMENT_METHOD_CODE);
        }

        PaymentMethod paymentMethod = paymentMethodMapper.toEntity(request);
        paymentMethod.setStatus(Status.ACTIVE);
        PaymentMethod savedPaymentMethod = paymentMethodRepository.save(paymentMethod);
        return paymentMethodMapper.toResponse(savedPaymentMethod);
    }
}

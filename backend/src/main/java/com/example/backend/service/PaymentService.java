package com.example.backend.service;

import com.example.backend.dto.request.PaymentRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.PaymentResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.PaymentMapper;
import com.example.backend.model.Payment;
import com.example.backend.model.PaymentMethod;
import com.example.backend.model.PurchaseOrder;
import com.example.backend.model.User;
import com.example.backend.model.enums.PurchaseOrderPaymentStatus;
import com.example.backend.repository.PaymentMethodRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.PurchaseOrderRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final UserRepository userRepository;
    private final PaymentMapper paymentMapper;

    @Transactional
    public PaymentResponseDto createPayment(PaymentRequestDto request) {
        PurchaseOrder purchaseOrder = purchaseOrderRepository.findByIdForUpdate(request.getPurchaseOrderId())
                .orElseThrow(() -> new InvalidException(ErrorCode.PURCHASE_ORDER_NOT_FOUND));

        PaymentMethod paymentMethod = paymentMethodRepository.findById(request.getPaymentMethodId())
                .orElseThrow(() -> new InvalidException(ErrorCode.PAYMENT_METHOD_NOT_FOUND));

        BigDecimal totalPaidAmount = paymentRepository.sumAmountByPurchaseOrderId(purchaseOrder.getId());
        BigDecimal remainingAmount = purchaseOrder.getTotalAmount().subtract(totalPaidAmount);

        if (request.getAmount().compareTo(remainingAmount) > 0) {
            throw new InvalidException(ErrorCode.PAYMENT_AMOUNT_EXCEEDS_REMAINING);
        }

        User currentUser = getCurrentUser();

        Payment payment = Payment.builder()
                .purchaseOrder(purchaseOrder)
                .paymentMethod(paymentMethod)
                .paymentDate(request.getPaymentDate())
                .amount(request.getAmount())
                .note(request.getNote())
                .createdBy(currentUser)
                .build();

        Payment savedPayment = paymentRepository.save(payment);
        BigDecimal updatedTotalPaidAmount = totalPaidAmount.add(savedPayment.getAmount());
        BigDecimal updatedRemainingAmount = purchaseOrder.getTotalAmount().subtract(updatedTotalPaidAmount);

        updatePurchaseOrderPaymentStatus(purchaseOrder, updatedRemainingAmount);

        return buildResponse(savedPayment, updatedTotalPaidAmount, updatedRemainingAmount);
    }

    public PageResponseDto<PaymentResponseDto> getPaymentHistoryByPurchaseOrderId(Long purchaseOrderId, Pageable pageable) {
        PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new InvalidException(ErrorCode.PURCHASE_ORDER_NOT_FOUND));

        BigDecimal totalPaidAmount = paymentRepository.sumAmountByPurchaseOrderId(purchaseOrderId);
        BigDecimal remainingAmount = purchaseOrder.getTotalAmount().subtract(totalPaidAmount);

        Page<Payment> paymentPage = paymentRepository.findByPurchaseOrderIdOrderByPaymentDateDesc(purchaseOrderId, pageable);
        Page<PaymentResponseDto> dtoPage = paymentPage.map(payment -> buildResponse(payment, totalPaidAmount, remainingAmount));
        return PageResponseDto.from(dtoPage);
    }

    private PaymentResponseDto buildResponse(Payment payment, BigDecimal totalPaidAmount, BigDecimal remainingAmount) {
        PaymentResponseDto response = paymentMapper.toResponse(payment);
        response.setTotalPaidAmount(totalPaidAmount);
        response.setRemainingAmount(remainingAmount);
        return response;
    }

    private void updatePurchaseOrderPaymentStatus(PurchaseOrder purchaseOrder, BigDecimal remainingAmount) {
        if (remainingAmount.compareTo(BigDecimal.ZERO) == 0) {
            purchaseOrder.setPaymentStatus(PurchaseOrderPaymentStatus.PAID);
        } else {
            purchaseOrder.setPaymentStatus(PurchaseOrderPaymentStatus.PARTIALLY_PAID);
        }
    }

    private User getCurrentUser() {
        String uuid = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUuid(uuid)
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));
    }
}

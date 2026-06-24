package com.example.backend.service;

import com.example.backend.dto.request.PurchaseOrderDetailRequestDto;
import com.example.backend.dto.request.PurchaseOrderRequestDto;
import com.example.backend.dto.request.PurchaseOrderStatusUpdateRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.PurchaseOrderResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.PurchaseOrderDetailMapper;
import com.example.backend.mapper.PurchaseOrderMapper;
import com.example.backend.model.*;
import com.example.backend.model.enums.PurchaseOrderStatus;
import com.example.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderDetailRepository purchaseOrderDetailRepository;
    private final SupplierRepository supplierRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final PurchaseOrderDetailMapper purchaseOrderDetailMapper;

    public PageResponseDto<PurchaseOrderResponseDto> getAllPurchaseOrders(String keyword, Pageable pageable) {
        Page<PurchaseOrder> purchaseOrderPage;
        if (StringUtils.hasText(keyword)) {
            purchaseOrderPage = purchaseOrderRepository.search(keyword, pageable);
        } else {
            purchaseOrderPage = purchaseOrderRepository.findAll(pageable);
        }
        Page<PurchaseOrderResponseDto> dtoPage = purchaseOrderPage.map(this::buildResponseWithDetails);
        return PageResponseDto.from(dtoPage);
    }

    public PurchaseOrderResponseDto getPurchaseOrderById(Long id) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PURCHASE_ORDER_NOT_FOUND));
        return buildResponseWithDetails(order);
    }

    @Transactional
    public PurchaseOrderResponseDto createPurchaseOrder(PurchaseOrderRequestDto request) {
        if (purchaseOrderRepository.existsByCode(request.getCode())) {
            throw new InvalidException(ErrorCode.CONFLICT_PURCHASE_ORDER_CODE);
        }

        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new InvalidException(ErrorCode.SUPPLIER_NOT_FOUND));

        User currentUser = getCurrentUser();

        PurchaseOrder purchaseOrder = PurchaseOrder.builder()
                .code(request.getCode())
                .supplier(supplier)
                .createdBy(currentUser)
                .orderDate(request.getOrderDate())
                .note(request.getNote())
                .status(PurchaseOrderStatus.DRAFT)
                .totalAmount(BigDecimal.ZERO)
                .build();

        PurchaseOrder savedOrder = purchaseOrderRepository.save(purchaseOrder);

        List<PurchaseOrderDetail> details = buildDetails(request.getDetails(), savedOrder);
        purchaseOrderDetailRepository.saveAll(details);

        BigDecimal totalAmount = details.stream()
                .map(d -> d.getUnitPrice().multiply(BigDecimal.valueOf(d.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        savedOrder.setTotalAmount(totalAmount);
        purchaseOrderRepository.save(savedOrder);

        return buildResponseWithDetails(savedOrder);
    }

    @Transactional
    public PurchaseOrderResponseDto updateStatus(Long id, PurchaseOrderStatusUpdateRequestDto request) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PURCHASE_ORDER_NOT_FOUND));

        PurchaseOrderStatus currentStatus = order.getStatus();
        PurchaseOrderStatus newStatus = request.getStatus();

        validateStatusTransition(currentStatus, newStatus);

        order.setStatus(newStatus);

        if (newStatus == PurchaseOrderStatus.RECEIVED) {
            order.setReceivedDate(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        }

        PurchaseOrder updatedOrder = purchaseOrderRepository.save(order);
        return buildResponseWithDetails(updatedOrder);
    }

    private void validateStatusTransition(PurchaseOrderStatus current, PurchaseOrderStatus next) {
        boolean valid = (current == PurchaseOrderStatus.DRAFT && next == PurchaseOrderStatus.PENDING)
                || (current == PurchaseOrderStatus.PENDING && next == PurchaseOrderStatus.RECEIVED);

        if (!valid) {
            throw new InvalidException(ErrorCode.INVALID_PURCHASE_ORDER_STATUS_TRANSITION);
        }
    }

    private List<PurchaseOrderDetail> buildDetails(List<PurchaseOrderDetailRequestDto> detailRequests,
                                                   PurchaseOrder order) {
        List<PurchaseOrderDetail> details = new ArrayList<>();
        for (PurchaseOrderDetailRequestDto req : detailRequests) {
            ProductVariant variant = productVariantRepository.findById(req.getVariantId())
                    .orElseThrow(() -> new InvalidException(ErrorCode.VARIANT_NOT_FOUND));

            PurchaseOrderDetail detail = PurchaseOrderDetail.builder()
                    .purchaseOrder(order)
                    .variant(variant)
                    .quantity(req.getQuantity())
                    .unitPrice(req.getUnitPrice())
                    .build();
            details.add(detail);
        }
        return details;
    }

    private PurchaseOrderResponseDto buildResponseWithDetails(PurchaseOrder order) {
        PurchaseOrderResponseDto dto = purchaseOrderMapper.toResponse(order);
        List<PurchaseOrderDetail> details = purchaseOrderDetailRepository.findByPurchaseOrderId(order.getId());
        dto.setDetails(details.stream()
                .map(purchaseOrderDetailMapper::toResponse)
                .toList());
        return dto;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));
    }
}
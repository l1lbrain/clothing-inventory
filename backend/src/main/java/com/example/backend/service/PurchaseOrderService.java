package com.example.backend.service;

import com.example.backend.dto.request.PurchaseOrderDetailRequestDto;
import com.example.backend.dto.request.PurchaseOrderRequestDto;
import com.example.backend.dto.request.PurchaseOrderStatusUpdateDto;
import com.example.backend.dto.response.PurchaseOrderDetailResponseDto;
import com.example.backend.dto.response.PurchaseOrderResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.PurchaseOrderDetailMapper;
import com.example.backend.mapper.PurchaseOrderMapper;
import com.example.backend.model.PurchaseOrder;
import com.example.backend.model.PurchaseOrderDetail;
import com.example.backend.model.ProductVariant;
import com.example.backend.model.Supplier;
import com.example.backend.model.User;
import com.example.backend.model.enums.PurchaseOrderStatus;
import com.example.backend.repository.PurchaseOrderDetailRepository;
import com.example.backend.repository.PurchaseOrderRepository;
import com.example.backend.repository.ProductVariantRepository;
import com.example.backend.repository.SupplierRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

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

    public List<PurchaseOrderResponseDto> getAllPurchaseOrders() {
        return purchaseOrderRepository.findAll().stream()
                .map(order -> {
                    PurchaseOrderResponseDto dto = purchaseOrderMapper.toResponse(order);
                    List<PurchaseOrderDetail> details = purchaseOrderDetailRepository.findByPurchaseOrderId(order.getId());
                    dto.setDetails(details.stream()
                            .map(purchaseOrderDetailMapper::toResponse)
                            .collect(Collectors.toList()));
                    return dto;
                })
                .collect(Collectors.toList());
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
                .status(PurchaseOrderStatus.DRAFT.name())
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
    public PurchaseOrderResponseDto updateStatus(Long id, PurchaseOrderStatusUpdateDto request) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PURCHASE_ORDER_NOT_FOUND));

        PurchaseOrderStatus currentStatus = PurchaseOrderStatus.valueOf(order.getStatus());
        PurchaseOrderStatus newStatus = request.getStatus();

        validateStatusTransition(currentStatus, newStatus);

        order.setStatus(newStatus.name());

        if (newStatus == PurchaseOrderStatus.RECEIVED) {
            order.setReceivedDate(LocalDateTime.now());
        }

        PurchaseOrder updatedOrder = purchaseOrderRepository.save(order);
        return buildResponseWithDetails(updatedOrder);
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

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
                .collect(Collectors.toList()));
        return dto;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));
    }
}

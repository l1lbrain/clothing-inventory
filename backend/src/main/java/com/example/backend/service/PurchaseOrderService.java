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
import com.example.backend.model.enums.PurchaseOrderPaymentStatus;
import com.example.backend.model.enums.PurchaseOrderStatus;
import com.example.backend.repository.*;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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

    private static final String TRANSACTION_TYPE_IN = "IN";

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderDetailRepository purchaseOrderDetailRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final SupplierRepository supplierRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final PurchaseOrderDetailMapper purchaseOrderDetailMapper;

    public PageResponseDto<PurchaseOrderResponseDto> getAllPurchaseOrders(String keyword, PurchaseOrderStatus status, Pageable pageable) {
        Specification<PurchaseOrder> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(criteriaBuilder.notEqual(root.get("status"), PurchaseOrderStatus.CANCELLED));

            if (StringUtils.hasText(keyword)) {
                String keywordLower = "%" + keyword.toLowerCase() + "%";
                Predicate codePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("code")), keywordLower);
                Predicate namePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("supplier").get("name")), keywordLower);
                predicates.add(criteriaBuilder.or(codePredicate, namePredicate));
            }

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<PurchaseOrder> purchaseOrderPage = purchaseOrderRepository.findAll(spec, pageable);
        Page<PurchaseOrderResponseDto> dtoPage = purchaseOrderPage.map(this::buildResponseWithDetails);
        return PageResponseDto.from(dtoPage);
    }

    public PageResponseDto<PurchaseOrderResponseDto> getReceivedPurchaseOrders(String keyword, PurchaseOrderStatus status, Pageable pageable) {
        PurchaseOrderStatus finalStatus = (status == null) ? PurchaseOrderStatus.RECEIVED : status;
        return getAllPurchaseOrders(keyword, finalStatus, pageable);
    }

    public PurchaseOrderResponseDto getPurchaseOrderById(Long id) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PURCHASE_ORDER_NOT_FOUND));
        return buildResponseWithDetails(order);
    }

    @Transactional
    public PurchaseOrderResponseDto createPurchaseOrder(PurchaseOrderRequestDto request) {

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
                .paymentStatus(PurchaseOrderPaymentStatus.UNPAID)
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
            receivePurchaseOrder(order);
        }

        PurchaseOrder updatedOrder = purchaseOrderRepository.save(order);
        return buildResponseWithDetails(updatedOrder);
    }

    private void receivePurchaseOrder(PurchaseOrder order) {
        User currentUser = getCurrentUser();
        List<PurchaseOrderDetail> details = purchaseOrderDetailRepository.findByPurchaseOrderId(order.getId());
        List<InventoryTransaction> transactions = new ArrayList<>();

        for (PurchaseOrderDetail detail : details) {
            ProductVariant variant = productVariantRepository.findByIdForUpdate(detail.getVariant().getId())
                    .orElseThrow(() -> new InvalidException(ErrorCode.VARIANT_NOT_FOUND));

            Integer quantityBefore = variant.getQuantityOnHand();
            Integer quantityAfter = quantityBefore + detail.getQuantity();

            variant.setQuantityOnHand(quantityAfter);

            InventoryTransaction transaction = InventoryTransaction.builder()
                    .variant(variant)
                    .purchaseOrderDetail(detail)
                    .transactionType(TRANSACTION_TYPE_IN)
                    .quantity(detail.getQuantity())
                    .quantityBefore(quantityBefore)
                    .quantityAfter(quantityAfter)
                    .note("Receive purchase order " + order.getCode())
                    .createdBy(currentUser)
                    .build();
            transactions.add(transaction);
        }

        inventoryTransactionRepository.saveAll(transactions);
    }

    private void validateStatusTransition(PurchaseOrderStatus current, PurchaseOrderStatus next) {
        boolean valid =
                (current == PurchaseOrderStatus.DRAFT    && next == PurchaseOrderStatus.PENDING)
             || (current == PurchaseOrderStatus.PENDING  && next == PurchaseOrderStatus.RECEIVED)
             || (current == PurchaseOrderStatus.DRAFT    && next == PurchaseOrderStatus.CANCELLED)
             || (current == PurchaseOrderStatus.PENDING  && next == PurchaseOrderStatus.CANCELLED);

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

    @Transactional
    public PurchaseOrderResponseDto updatePurchaseOrder(Long id, PurchaseOrderRequestDto request) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new InvalidException(ErrorCode.PURCHASE_ORDER_NOT_FOUND));

        if (order.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new InvalidException(ErrorCode.PURCHASE_ORDER_CANNOT_BE_MODIFIED);
        }

        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new InvalidException(ErrorCode.SUPPLIER_NOT_FOUND));

        order.setSupplier(supplier);
        order.setNote(request.getNote());

        purchaseOrderDetailRepository.deleteByPurchaseOrderId(order.getId());

        List<PurchaseOrderDetail> newDetails = buildDetails(request.getDetails(), order);
        purchaseOrderDetailRepository.saveAll(newDetails);

        BigDecimal totalAmount = newDetails.stream()
                .map(d -> d.getUnitPrice().multiply(BigDecimal.valueOf(d.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        order.setTotalAmount(totalAmount);
        PurchaseOrder saved = purchaseOrderRepository.save(order);
        return buildResponseWithDetails(saved);
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
        String uuid = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUuid(uuid)
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));
    }
}
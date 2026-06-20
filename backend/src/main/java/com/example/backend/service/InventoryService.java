package com.example.backend.service;

import com.example.backend.dto.request.InventoryAdjustRequest;
import com.example.backend.dto.response.InventoryDetailResponse;
import com.example.backend.dto.response.InventoryResponse;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.InventoryMapper;
import com.example.backend.model.*;
import com.example.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final UserRepository userRepository; // 1. Tiêm thêm UserRepository vào để sửa lỗi Tìm User
    private final InventoryMapper inventoryMapper;

    public List<InventoryResponse> getCurrentInventory() {
        return inventoryRepository.findAll().stream().map(inventory -> {
            // ĐÃ SỬA: Lấy trực tiếp đối tượng Product từ Variant, bỏ hoàn toàn productRepository.findById()
            Product product = inventory.getVariant().getProduct();
            if (product == null) {
                product = new Product();
            }
            return inventoryMapper.toResponse(inventory, product);
        }).collect(Collectors.toList());
    }

    public InventoryDetailResponse getInventoryByVariantId(Long variantId) {
        Inventory inventory = inventoryRepository.findInventoryDetailByVariantId(variantId)
                .orElseThrow(() -> new InvalidException(ErrorCode.INVENTORY_NOT_FOUND));

        // ĐÃ SỬA: Lấy trực tiếp đối tượng Product đang liên kết trong Variant
        Product product = inventory.getVariant().getProduct();
        return inventoryMapper.toDetailResponse(inventory, product);
    }

    @Transactional
    public InventoryResponse adjustInventory(InventoryAdjustRequest request) {
        Inventory inventory = inventoryRepository.findByVariantId(request.getVariantId())
                .orElseThrow(() -> new InvalidException(ErrorCode.INVENTORY_NOT_FOUND));

        // 2. ĐÃ SỬA: Tìm thực thể User dưới DB bằng ID từ request để nạp vào Transaction
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));

        int qtyBefore = inventory.getQuantityOnHand();
        int qtyAdjust = request.getAdjustQuantity();
        int qtyAfter = qtyBefore + qtyAdjust;

        if (qtyAfter < 0) {
            throw new InvalidException(ErrorCode.INSUFFICIENT_STOCK);
        }

        inventory.setQuantityOnHand(qtyAfter);
        inventoryRepository.save(inventory);

        String txType = qtyAdjust > 0 ? "IN" : "OUT";
        if (request.getNote() != null && request.getNote().toLowerCase().contains("kiểm kê")) {
            txType = "ADJUST";
        }

        InventoryTransaction transaction = InventoryTransaction.builder()
                .variant(inventory.getVariant())
                .transactionType(txType)
                .quantity(Math.abs(qtyAdjust))
                .quantityBefore(qtyBefore)
                .quantityAfter(qtyAfter)
                .note(request.getNote())
                .createdBy(user) // 3. ĐÃ SỬA: Truyền cả cục đối tượng `user` vào (Hết lỗi Builder)
                .build();
        transactionRepository.save(transaction);

        // ĐÃ SỬA: Lấy trực tiếp Product từ Variant
        Product product = inventory.getVariant().getProduct();
        return inventoryMapper.toResponse(inventory, product);
    }
}
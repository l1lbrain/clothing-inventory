package com.example.backend.repository;

import com.example.backend.model.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository
        extends JpaRepository<InventoryTransaction, Long>, JpaSpecificationExecutor<InventoryTransaction> {

    // Lấy nhanh lịch sử biến động kho của duy nhất một SKU cụ thể, sắp xếp theo thời gian mới nhất lên đầu
    List<InventoryTransaction> findByVariantIdOrderByCreatedAtDesc(Long variantId);
}
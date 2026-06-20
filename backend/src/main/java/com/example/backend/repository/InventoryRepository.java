package com.example.backend.repository;

import com.example.backend.model.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    // Tìm kiếm bản ghi kho theo ID của biến thể (Vì mối quan hệ là 1-1 và biến thể là duy nhất)
    Optional<Inventory> findByVariantId(Long variantId);

    /**
     * Câu lệnh Query nâng cao (Nối bảng): Lấy chi tiết thông tin kho kèm theo thông tin của Product cha
     * Phục vụ trực tiếp cho DTO InventoryDetailResponse của bạn
     */
    @Query("SELECT i FROM Inventory i " +
            "JOIN FETCH i.variant v " +
            "WHERE v.id = :variantId")
    Optional<Inventory> findInventoryDetailByVariantId(@Param("variantId") Long variantId);
}
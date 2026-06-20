package com.example.backend.repository;

import com.example.backend.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    // Tìm kiếm biến thể bằng mã SKU duy nhất
    Optional<ProductVariant> findBySku(String sku);

    // Kiểm tra xem mã SKU này đã tồn tại trong hệ thống chưa (Phục vụ cho hàm Create)
    boolean existsBySku(String sku);

    // Lấy danh sách các biến thể thuộc một sản phẩm gốc (Product) cha
    List<ProductVariant> findByProductId(Long productId);
}
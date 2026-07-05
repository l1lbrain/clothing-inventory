package com.example.backend.repository;

import com.example.backend.model.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Page<Payment> findByPurchaseOrderIdOrderByPaymentDateDesc(Long purchaseOrderId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.purchaseOrder.id = :purchaseOrderId")
    BigDecimal sumAmountByPurchaseOrderId(@Param("purchaseOrderId") Long purchaseOrderId);

    @Query("SELECT COALESCE(SUM (p.amount), 0) FROM Payment p")
    BigDecimal sumAllAmount();
}

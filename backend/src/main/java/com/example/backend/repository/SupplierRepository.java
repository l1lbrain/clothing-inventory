package com.example.backend.repository;

import com.example.backend.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {
    Optional<Supplier> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByTaxCode(String taxCode);

    @Query("SELECT COUNT(s) FROM Supplier s")
    Long sumAllSupplier();
}

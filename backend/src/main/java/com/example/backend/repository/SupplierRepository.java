package com.example.backend.repository;

import com.example.backend.model.Supplier;
import com.example.backend.model.enums.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {
    Optional<Supplier> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByEmailAndStatus(String email, Status status);
    boolean existsByEmailAndStatusAndIdNot(String email, Status status, Long id);

    boolean existsByPhoneAndStatus(String phone, Status status);
    boolean existsByPhoneAndStatusAndIdNot(String phone, Status status, Long id);

    boolean existsByTaxCodeAndStatus(String taxCode, Status status);
    boolean existsByTaxCodeAndStatusAndIdNot(String taxCode, Status status, Long id);

    @Query("SELECT COUNT(s) FROM Supplier s")
    Long sumAllSupplier();
}

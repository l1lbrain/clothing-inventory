package com.example.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "suppliers")
@Data
public class Supplier {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "supplier_code", nullable = false, unique = true, length = 50)
    private String supplierCode;

    @Column(name = "supplier_name", nullable = false)
    private String supplierName;

    @Column(name = "contact_person")
    private String contactPerson;

    @Column(length = 20)
    private String phone;

    private String email;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "tax_code", length = 50)
    private String taxCode;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(columnDefinition = "TINYINT DEFAULT 1")
    private Integer status = 1;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}

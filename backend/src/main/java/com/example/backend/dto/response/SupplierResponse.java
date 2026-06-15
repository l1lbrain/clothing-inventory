package com.example.backend.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SupplierResponse {
    private Long id;
    private String code;
    private String name;
    private String contactPerson;
    private String phone;
    private String email;
    private String address;
    private String taxCode;
    private String note;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

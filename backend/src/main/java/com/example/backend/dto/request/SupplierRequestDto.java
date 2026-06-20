package com.example.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SupplierRequestDto {

    @NotBlank(message = "Supplier code is required")
    @Size(max = 50, message = "Supplier code must be at most 50 characters")
    private String code;

    @NotBlank(message = "Supplier name is required")
    @Size(max = 255, message = "Supplier name must be at most 255 characters")
    private String name;

    @Size(max = 255, message = "Contact person name must be at most 255 characters")
    private String contactPerson;

    @Size(max = 20, message = "Phone number must be at most 20 characters")
    private String phone;

    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email must be at most 255 characters")
    private String email;

    private String address;

    @Size(max = 50, message = "Tax code must be at most 50 characters")
    private String taxCode;

    private String note;
}

package com.example.backend.dto.request;

import com.example.backend.model.enums.Status;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SupplierRequestDto {

    @Size(max = 50, message = "Supplier code cannot exceed 50 characters")
    private String code;

    @NotBlank(message = "Supplier name cannot be blank")
    @Size(max = 255, message = "Supplier name cannot exceed 255 characters")
    private String name;

    @Size(max = 255, message = "Contact person name cannot exceed 255 characters")
    private String contactPerson;

    @Size(max = 20, message = "Phone number cannot exceed 20 characters")
    private String phone;

    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email cannot exceed 255 characters")
    private String email;

    private String address;

    @Size(max = 50, message = "Tax code cannot exceed 50 characters")
    private String taxCode;

    private String note;

    private Status status;
}
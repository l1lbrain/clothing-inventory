package com.example.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

public class AuthRequestDto {

    @Getter
    @Setter
    public static class Register {
        @NotBlank(message = "Username cannot be blank")
        @Size(max = 100, message = "Username cannot exceed 100 characters")
        private String username;

        @NotBlank(message = "Password cannot be blank")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        @NotBlank(message = "Full name cannot be blank")
        @Size(max = 255, message = "Full name cannot exceed 255 characters")
        private String fullName;

        @Size(max = 20, message = "Phone number cannot exceed 20 characters")
        private String phone;

        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Email cannot exceed 255 characters")
        private String email;

        @NotEmpty(message = "Roles cannot be empty")
        private List<String> roles;
    }

    @Getter
    @Setter
    public static class Login {
        @NotBlank(message = "Username cannot be blank")
        private String username;

        @NotBlank(message = "Password cannot be blank")
        private String password;
    }
}
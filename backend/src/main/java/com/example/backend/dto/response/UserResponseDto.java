package com.example.backend.dto.response;

import com.example.backend.model.enums.Status;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
public class UserResponseDto {
    private String uuid;
    private String username;
    private String fullName;
    private String phone;
    private String email;
    private Status status;
    private LocalDateTime createdAt;
    private Set<String> roles;
}

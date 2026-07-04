package com.example.backend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.Set;

@Data
public class UserRoleUpdateRequestDto {
    @NotEmpty(message = "Roles cannot be empty")
    private Set<String> roles;
}

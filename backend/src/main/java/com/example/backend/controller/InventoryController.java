package com.example.backend.controller;



import com.example.backend.dto.request.InventoryAdjustRequestDto;
import com.example.backend.dto.response.InventoryDetailResponseDto;
import com.example.backend.dto.response.InventoryResponseDto;
import com.example.backend.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/inventories")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<List<InventoryResponseDto>> getCurrentInventory() {
        List<InventoryResponseDto> response = inventoryService.getCurrentInventory();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/variant/{variantId}")
    public ResponseEntity<InventoryDetailResponseDto> getInventoryByVariantId(@PathVariable Long variantId) {
        InventoryDetailResponseDto response = inventoryService.getInventoryByVariantId(variantId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/adjust")
    public ResponseEntity<InventoryResponseDto> adjustInventory(@Valid @RequestBody InventoryAdjustRequestDto request) {
        InventoryResponseDto response = inventoryService.adjustInventory(request);
        return ResponseEntity.ok(response);
    }
}
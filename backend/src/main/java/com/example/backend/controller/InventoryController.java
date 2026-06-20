package com.example.backend.controller;



import com.example.backend.dto.request.InventoryAdjustRequest;
import com.example.backend.dto.response.InventoryDetailResponse;
import com.example.backend.dto.response.InventoryResponse;
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
    public ResponseEntity<List<InventoryResponse>> getCurrentInventory() {
        List<InventoryResponse> response = inventoryService.getCurrentInventory();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/variant/{variantId}")
    public ResponseEntity<InventoryDetailResponse> getInventoryByVariantId(@PathVariable Long variantId) {
        InventoryDetailResponse response = inventoryService.getInventoryByVariantId(variantId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/adjust")
    public ResponseEntity<InventoryResponse> adjustInventory(@Valid @RequestBody InventoryAdjustRequest request) {
        InventoryResponse response = inventoryService.adjustInventory(request);
        return ResponseEntity.ok(response);
    }
}
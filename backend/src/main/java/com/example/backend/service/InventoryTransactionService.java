package com.example.backend.service;

import com.example.backend.dto.request.TransactionSearchRequestDto;
import com.example.backend.dto.response.TransactionResponseDto;
import com.example.backend.mapper.InventoryTransactionMapper;
import com.example.backend.model.InventoryTransaction;
import com.example.backend.repository.InventoryTransactionRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryTransactionService {

    private final InventoryTransactionRepository transactionRepository;
    private final InventoryTransactionMapper transactionMapper;

    public List<TransactionResponseDto> searchTransactions(TransactionSearchRequestDto searchRequest) {
        Specification<InventoryTransaction> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (searchRequest.getVariantId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("variant").get("id"), searchRequest.getVariantId()));
            }
            if (searchRequest.getTransactionType() != null && !searchRequest.getTransactionType().isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("transactionType"), searchRequest.getTransactionType()));
            }
            if (searchRequest.getCreatedBy() != null) {
                predicates.add(criteriaBuilder.equal(root.get("createdBy"), searchRequest.getCreatedBy()));
            }
            if (searchRequest.getFromDate() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), searchRequest.getFromDate()));
            }
            if (searchRequest.getToDate() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), searchRequest.getToDate()));
            }

            query.orderBy(criteriaBuilder.desc(root.get("createdAt")));
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        return transactionRepository.findAll(spec).stream()
                .map(transactionMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<TransactionResponseDto> getHistoryByVariantId(Long variantId) {
        return transactionRepository.findByVariantIdOrderByCreatedAtDesc(variantId).stream()
                .map(transactionMapper::toResponse)
                .collect(Collectors.toList());
    }
}
package com.example.backend.service;

import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.TransactionResponseDto;
import com.example.backend.mapper.InventoryTransactionMapper;
import com.example.backend.model.InventoryTransaction;
import com.example.backend.repository.InventoryTransactionRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryTransactionService {

    private final InventoryTransactionRepository transactionRepository;
    private final InventoryTransactionMapper transactionMapper;

    public PageResponseDto<TransactionResponseDto> searchTransactions(String keyword, Pageable pageable) {
        Specification<InventoryTransaction> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(keyword)) {
                Predicate skuPredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("variant").get("sku")), "%" + keyword.toLowerCase() + "%");
                Predicate namePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("variant").get("product").get("name")), "%" + keyword.toLowerCase() + "%");
                predicates.add(criteriaBuilder.or(skuPredicate, namePredicate));
            }

            assert query != null;
            query.orderBy(criteriaBuilder.desc(root.get("createdAt")));
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<InventoryTransaction> transactionPage = transactionRepository.findAll(spec, pageable);
        Page<TransactionResponseDto> dtoPage = transactionPage.map(transactionMapper::toResponse);
        return PageResponseDto.from(dtoPage);
    }

    public PageResponseDto<TransactionResponseDto> getHistoryByVariantId(Long variantId, Pageable pageable) {
        Page<InventoryTransaction> transactionPage = transactionRepository.findByVariantIdOrderByCreatedAtDesc(variantId, pageable);
        Page<TransactionResponseDto> dtoPage = transactionPage.map(transactionMapper::toResponse);
        return PageResponseDto.from(dtoPage);
    }
}
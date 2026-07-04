package com.example.backend.service;

import com.example.backend.dto.request.UserRoleUpdateRequestDto;
import com.example.backend.dto.request.UserUpdateRequestDto;
import com.example.backend.dto.response.PageResponseDto;
import com.example.backend.dto.response.UserResponseDto;
import com.example.backend.exception.ErrorCode;
import com.example.backend.exception.InvalidException;
import com.example.backend.mapper.UserMapper;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.model.enums.Status;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;

    public PageResponseDto<UserResponseDto> getAllUsers(String keyword, Status status, Pageable pageable) {
        Specification<User> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            assert query != null;
            Subquery<Long> subquery = query.subquery(Long.class);
            Root<User> subRoot = subquery.from(User.class);
            Join<User, Role> subRoles = subRoot.join("roles");
            subquery.select(subRoot.get("id")).where(criteriaBuilder.equal(subRoles.get("name"), "admin"));

            predicates.add(criteriaBuilder.not(root.get("id").in(subquery)));

            if (StringUtils.hasText(keyword)) {
                String keywordLower = "%" + keyword.toLowerCase() + "%";
                Predicate usernamePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("username")), keywordLower);
                Predicate fullNamePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("fullName")), keywordLower);
                Predicate emailPredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), keywordLower);
                Predicate phonePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("phone")), keywordLower);
                predicates.add(criteriaBuilder.or(usernamePredicate, fullNamePredicate, emailPredicate, phonePredicate));
            }

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> userPage = userRepository.findAll(spec, pageable);
        return PageResponseDto.from(userPage.map(userMapper::toResponse));
    }

    @Transactional
    public UserResponseDto updateUser(String uuid, UserUpdateRequestDto request) {
        User user = userRepository.findByUuid(uuid)
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));

        if (StringUtils.hasText(request.getEmail()) && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new InvalidException(ErrorCode.CONFLICT_USER_EMAIL);
            }
            user.setEmail(request.getEmail());
        }

        if (StringUtils.hasText(request.getPhone()) && !request.getPhone().equals(user.getPhone())) {
            if (userRepository.existsByPhone(request.getPhone())) {
                throw new InvalidException(ErrorCode.CONFLICT_USER_PHONE);
            }
            user.setPhone(request.getPhone());
        }

        if (StringUtils.hasText(request.getFullName())) {
            user.setFullName(request.getFullName());
        }

        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }

        return userMapper.toResponse(user);
    }

    @Transactional
    public UserResponseDto updateUserRoles(String uuid, UserRoleUpdateRequestDto request) {
        User user = userRepository.findByUuid(uuid)
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));

        Set<Role> newRoles = request.getRoles().stream()
                .map(roleName -> {
                    if ("admin".equalsIgnoreCase(roleName)) {
                        throw new InvalidException(ErrorCode.FORBIDDEN_ACCESS);
                    }
                    return roleRepository.findByName(roleName)
                            .orElseThrow(() -> new InvalidException(ErrorCode.ROLE_NOT_FOUND));
                })
                .collect(Collectors.toSet());

        user.setRoles(newRoles);
        return userMapper.toResponse(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));
    }

    public User findByUuid(String uuid) {
        return userRepository.findByUuid(uuid)
                .orElseThrow(() -> new InvalidException(ErrorCode.ACCOUNT_NOT_FOUND));
    }
}

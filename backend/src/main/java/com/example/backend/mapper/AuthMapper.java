package com.example.backend.mapper;

import com.example.backend.dto.response.AuthResponseDto;
import com.example.backend.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuthMapper {
    @Mapping(target = "accessToken", source = "accessToken")
    AuthResponseDto.info toInfoResponse(User user, String accessToken);

    AuthResponseDto.Me toMe(User user);
}

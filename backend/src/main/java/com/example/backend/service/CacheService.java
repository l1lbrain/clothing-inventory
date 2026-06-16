package com.example.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class CacheService {
    private final StringRedisTemplate stringRedisTemplate;

    public void saveRefreshToken(String uuid, String refreshToken) {
        stringRedisTemplate.opsForValue().set("refresh_token:" + uuid, refreshToken, 7, TimeUnit.DAYS);
    }

    public boolean deleteRefreshToken(String uuid, String refreshToken) {
        String key = "refresh_token:" + uuid;
        String redisUuid = stringRedisTemplate.opsForValue().get(key);
        if (redisUuid == null || !redisUuid.equals(refreshToken)) {
            return false;
        }
        stringRedisTemplate.delete(key);
        return true;
    }

}

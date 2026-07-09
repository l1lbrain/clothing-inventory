package com.example.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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

    /**
     * Sinh mã đơn đặt hàng tự tăng theo ngày, sử dụng Redis INCR.
     * Định dạng: PO-YYMMDD-XXXX (ví dụ: PO-260709-0001)
     * Key Redis: seq:purchase_order:YYMMDD — tự động hết hạn sau 2 ngày.
     */
    public String generatePurchaseOrderCode() {
        String dateStr = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))
                // .plusDays(1)
                .format(DateTimeFormatter.ofPattern("yyMMdd"));
        String key = "seq:purchase_order:" + dateStr;
        Long seq = stringRedisTemplate.opsForValue().increment(key);
        if (seq != null && seq == 1) {
            stringRedisTemplate.expire(key, 2, TimeUnit.DAYS);
        }
        return String.format("PO-%s-%04d", dateStr, seq);
    }

}

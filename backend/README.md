# Danh sách API:
### GET `/api/v1/purchase-orders`: Lấy danh sách tất cả các đơn (chưa phân trang)
**response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "request successfully",
  "data": [
    {
      "id": 1,
      "code": "PO-TEST-001",
      "supplierId": 1,
      "supplierName": "Test1",
      "createdById": 2,
      "createdByName": "ADMIN",
      "orderDate": "2026-06-24T02:15:00",
      "receivedDate": null,
      "totalAmount": 750000.00,
      "status": "PENDING",
      "note": "Test tao don hang khong can data that",
      "createdAt": "2026-06-24T03:07:20",
      "updatedAt": "2026-06-24T03:16:33",
      "details": [
        {
          "id": 1,
          "variantId": 1,
          "sku": "Test Variant1",
          "quantity": 5,
          "unitPrice": 150000.00,
          "lineTotal": 750000.00
        }
      ]
    }
  ],
  "timestamp": "2026-06-24T03:42:57.143340300"
}
```
### POST `/api/v1/purchase-orders`: Tạo đơn mới

**body -> raw -> json:**
```json
{
    "code": ...,
    "supplierId": "phải là id đã tồn tại trong db",
    "orderDate": "2026-06-24T02:15:00",
    "note": "Test tao don hang khong can data that",
    "details": [
        {
            "variantId": "phải là id đã tồn tại trong db",
            "quantity": 5,
            "unitPrice": 150000
        }
    ]
}
```
### GET `/api/v1/purchase-orders/{id}`: Lấy đơn theo id
**response:**
```json
{
    "success": true,
    "statusCode": 200,
    "message": "request successfully",
    "data": {
        "id": 1,
        "code": "PO-TEST-001",
        "supplierId": 1,
        "supplierName": "Test1",
        "createdById": 2,
        "createdByName": "ADMIN",
        "orderDate": "2026-06-24T02:15:00",
        "receivedDate": null,
        "totalAmount": 750000.00,
        "status": "PENDING",
        "note": "Test tao don hang khong can data that",
        "createdAt": "2026-06-24T03:07:20",
        "updatedAt": "2026-06-24T03:16:33",
        "details": [
            {
                "id": 1,
                "variantId": 1,
                "sku": "Test Variant1",
                "quantity": 5,
                "unitPrice": 150000.00,
                "lineTotal": 750000.00
            }
        ]
    },
    "timestamp": "2026-06-24T03:34:50.741923100"
}
```

### PATCH `/api/v1/purchase-orders/1/status`: đổi trạng thái đơn hàng (Phải theo thứ tự DRAFT -> PENDING -> RECEIVED nếu không sẽ throw lỗi)

**body -> raw -> json:**
```json
{
    "status": "PENDING / RECEIVED"
}
```
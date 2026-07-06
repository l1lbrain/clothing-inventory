# 🧪 TEST CASES — Clothing Inventory System

> **Công cụ đề xuất**: Postman / Insomnia cho API, trình duyệt cho UI  
> **Base URL Backend**: `http://localhost:8080/api/v1`  
> **Base URL Frontend**: `http://localhost:5173`  
> **Ký hiệu**: ✅ Expect Pass | ❌ Expect Fail/Error | 🔍 Cần quan sát kỹ

---

## 📑 MỤC LỤC

1. [AUTH — Xác thực](#1-auth--xác-thực)
2. [USER — Quản lý Tài khoản](#2-user--quản-lý-tài-khoản)
3. [PRODUCT — Quản lý Sản phẩm](#3-product--quản-lý-sản-phẩm)
4. [SUPPLIER — Quản lý Nhà cung cấp](#4-supplier--quản-lý-nhà-cung-cấp)
5. [PURCHASE ORDER — Đơn đặt hàng](#5-purchase-order--đơn-đặt-hàng)
6. [PAYMENT — Thanh toán](#6-payment--thanh-toán)
7. [INVENTORY TRANSACTION — Lịch sử tồn kho](#7-inventory-transaction--lịch-sử-tồn-kho)
8. [SECURITY & AUTHORIZATION](#8-security--authorization)
9. [FRONTEND UI FLOWS](#9-frontend-ui-flows)
10. [EDGE CASES & BOUNDARY](#10-edge-cases--boundary)

---

## 1. AUTH — Xác thực

### TC-AUTH-001 — Đăng nhập thành công ✅
```
POST /api/v1/auth/login
Body: { "username": "admin", "password": "123456" }

Expect:
- Status: 200 OK
- Body có: data.accessToken (string JWT)
- Response Set-Cookie header có "refresh_token" (HttpOnly)
- data.fullName, data.uuid, data.email có giá trị
```

### TC-AUTH-002 — Sai password ❌
```
POST /api/v1/auth/login
Body: { "username": "admin", "password": "wrongpassword" }

Expect:
- Status: 401 hoặc 400
- Body có thông báo lỗi
- Không có accessToken trong response
```

### TC-AUTH-003 — Username không tồn tại ❌
```
POST /api/v1/auth/login
Body: { "username": "not_exist_user_xyz", "password": "123456" }

Expect:
- Status: 401 hoặc 404
- Không có accessToken
```

### TC-AUTH-004 — Đăng nhập tài khoản INACTIVE ❌
```
Điều kiện: Có user với status = INACTIVE
POST /api/v1/auth/login
Body: { "username": "<inactive_user>", "password": "123456" }

Expect:
- Status: 403 hoặc 401
- Thông báo tài khoản bị vô hiệu hóa
```

### TC-AUTH-005 — Thiếu field bắt buộc ❌
```
POST /api/v1/auth/login
Body: { "username": "admin" }   ← thiếu password

Expect:
- Status: 400 Bad Request
- Thông báo validation error
```

### TC-AUTH-006 — Body rỗng ❌
```
POST /api/v1/auth/login
Body: {}

Expect: Status 400, validation error
```

### TC-AUTH-007 — GET /auth/me với token hợp lệ ✅
```
GET /api/v1/auth/me
Headers: Authorization: Bearer <valid_token>

Expect:
- Status: 200
- Body có: uuid, fullName, email, phone
```

### TC-AUTH-008 — GET /auth/me không có token ❌
```
GET /api/v1/auth/me
(Không có Authorization header)

Expect: Status 401
```

### TC-AUTH-009 — GET /auth/me với token hết hạn ❌
```
GET /api/v1/auth/me
Headers: Authorization: Bearer <expired_token>

Expect: Status 401
```

### TC-AUTH-010 — GET /auth/me với token giả mạo ❌
```
GET /api/v1/auth/me
Headers: Authorization: Bearer invalidtoken123

Expect: Status 401
```

### TC-AUTH-011 — Refresh Token thành công ✅
```
POST /api/v1/auth/refresh-token
Cookie: refresh_token=<valid_refresh_token>

Expect:
- Status: 200
- Body có: data.accessToken (token mới)
```

### TC-AUTH-012 — Refresh Token không có Cookie ❌
```
POST /api/v1/auth/refresh-token
(Không có cookie)

Expect: Status 401
```

### TC-AUTH-013 — Refresh Token hết hạn ❌
```
POST /api/v1/auth/refresh-token
Cookie: refresh_token=<expired_refresh_token>

Expect: Status 401
```

### TC-AUTH-014 — Refresh Token đã bị logout (xóa khỏi Redis) ❌
```
1. Đăng nhập → lấy refresh_token
2. POST /api/v1/auth/logout (với refresh_token cookie)
3. POST /api/v1/auth/refresh-token (với refresh_token cũ)

Expect bước 3: Status 401 (token đã bị xóa khỏi Redis)
```

### TC-AUTH-015 — Đăng xuất thành công ✅
```
POST /api/v1/auth/logout
Cookie: refresh_token=<valid_token>
Authorization: Bearer <access_token>

Expect: Status 200, Cookie bị clear
```

### TC-AUTH-016 — Logout không có refresh_token cookie ❌
```
POST /api/v1/auth/logout
(Không có cookie)

Expect: Status 401/400
```

### TC-AUTH-017 — Đăng ký tài khoản mới (Admin only) ✅
```
POST /api/v1/auth/register
Authorization: Bearer <admin_token>
Body: {
  "username": "newuser001",
  "password": "Test@123",
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "newuser@test.com",
  "roles": ["coordinator"]
}

Expect: Status 200, user được tạo
```

### TC-AUTH-018 — Đăng ký username đã tồn tại ❌
```
POST /api/v1/auth/register
Authorization: Bearer <admin_token>
Body: { "username": "admin", ... }

Expect: Status 409 Conflict
```

### TC-AUTH-019 — Đăng ký với role "admin" ❌
```
POST /api/v1/auth/register
Authorization: Bearer <admin_token>
Body: { ..., "roles": ["admin"] }

Expect: Status 400/403 — không được tạo tài khoản admin
```

### TC-AUTH-020 — Đăng ký với role không hợp lệ ❌
```
POST /api/v1/auth/register
Authorization: Bearer <admin_token>
Body: { ..., "roles": ["super-admin"] }

Expect: Status 400 — role không tồn tại
```

### TC-AUTH-021 — Đăng ký bởi non-admin ❌
```
POST /api/v1/auth/register
Authorization: Bearer <coordinator_token>
Body: { ... }

Expect: Status 403 Forbidden
```

---

## 2. USER — Quản lý Tài khoản

### TC-USER-001 — Lấy danh sách user (Admin) ✅
```
GET /api/v1/users
Authorization: Bearer <admin_token>

Expect:
- Status: 200
- Body có: data.items[], data.page, data.totalElements, data.totalPages
- Danh sách KHÔNG có user có role "admin"
```

### TC-USER-002 — Lấy danh sách user (Non-admin) ❌
```
GET /api/v1/users
Authorization: Bearer <coordinator_token>

Expect: Status 403 Forbidden
```

### TC-USER-003 — Phân trang danh sách user ✅
```
GET /api/v1/users?page=1&pageSize=5
Authorization: Bearer <admin_token>

Expect: Trả về tối đa 10 user (hardcode trong controller)
```

### TC-USER-004 — Tìm kiếm user theo username ✅
```
GET /api/v1/users?keyword=coordinator
Authorization: Bearer <admin_token>

Expect: Chỉ trả về user có username/fullName/email/phone chứa "coordinator"
```

### TC-USER-005 — Lọc user theo status ACTIVE ✅
```
GET /api/v1/users?status=ACTIVE
Authorization: Bearer <admin_token>

Expect: Chỉ trả về user có status = ACTIVE
```

### TC-USER-006 — Lọc user theo status không hợp lệ ❌
```
GET /api/v1/users?status=UNKNOWN
Authorization: Bearer <admin_token>

Expect: Status 400 hoặc trả về rỗng
```

### TC-USER-007 — Sắp xếp user theo createdAt desc ✅
```
GET /api/v1/users?sortBy=createdAt&sortDirection=desc
Authorization: Bearer <admin_token>

Expect: User mới nhất xuất hiện đầu tiên
```

### TC-USER-008 — Cập nhật thông tin user ✅
```
PATCH /api/v1/users/{uuid}
Authorization: Bearer <admin_token>
Body: { "fullName": "Tên Mới", "phone": "0987654321" }

Expect: Status 200, user được cập nhật
```

### TC-USER-009 — Cập nhật email đã tồn tại ❌
```
PATCH /api/v1/users/{uuid}
Authorization: Bearer <admin_token>
Body: { "email": "<email_của_user_khác>" }

Expect: Status 409 Conflict
```

### TC-USER-010 — Cập nhật phone đã tồn tại ❌
```
PATCH /api/v1/users/{uuid}
Authorization: Bearer <admin_token>
Body: { "phone": "<phone_của_user_khác>" }

Expect: Status 409 Conflict
```

### TC-USER-011 — Cập nhật user không tồn tại ❌
```
PATCH /api/v1/users/non-existent-uuid-123
Authorization: Bearer <admin_token>
Body: { "fullName": "Test" }

Expect: Status 404 Not Found
```

### TC-USER-012 — Cập nhật role user ✅
```
PUT /api/v1/users/{uuid}/roles
Authorization: Bearer <admin_token>
Body: { "roles": ["warehouse-staff", "coordinator"] }

Expect: Status 200, roles được thay thế hoàn toàn
```

### TC-USER-013 — Cập nhật role thành "admin" ❌
```
PUT /api/v1/users/{uuid}/roles
Authorization: Bearer <admin_token>
Body: { "roles": ["admin"] }

Expect: Status 403 — không thể gán role admin qua endpoint này
```

### TC-USER-014 — Cập nhật role không tồn tại ❌
```
PUT /api/v1/users/{uuid}/roles
Authorization: Bearer <admin_token>
Body: { "roles": ["nonexistent-role"] }

Expect: Status 400 Not Found
```

### TC-USER-015 — Vô hiệu hóa user (status = INACTIVE) ✅
```
PATCH /api/v1/users/{uuid}
Authorization: Bearer <admin_token>
Body: { "status": "INACTIVE" }

Expect: Status 200, user.status = INACTIVE
Verify: User đó login lại sẽ bị từ chối (TC-AUTH-004)
```

### TC-USER-016 — page=0 (invalid) ❌
```
GET /api/v1/users?page=0
Authorization: Bearer <admin_token>

Expect: Status 400 — page phải >= 1
```

---

## 3. PRODUCT — Quản lý Sản phẩm

### TC-PROD-001 — Lấy danh sách sản phẩm ✅
```
GET /api/v1/products
Authorization: Bearer <any_valid_token>

Expect:
- Status 200
- Không có sản phẩm status = DELETED trong kết quả
- Có phân trang (page, size, totalElements, totalPages)
```

### TC-PROD-002 — Tìm kiếm sản phẩm theo tên ✅
```
GET /api/v1/products?keyword=áo
Authorization: Bearer <any_valid_token>

Expect: Chỉ trả về sản phẩm có code hoặc name chứa "áo" (case-insensitive)
```

### TC-PROD-003 — Lọc sản phẩm theo status ACTIVE ✅
```
GET /api/v1/products?status=ACTIVE
Authorization: Bearer <any_valid_token>

Expect: Chỉ sản phẩm ACTIVE, không có INACTIVE hoặc DELETED
```

### TC-PROD-004 — Tạo sản phẩm mới (warehouse-staff) ✅
```
POST /api/v1/products
Authorization: Bearer <warehouse_staff_token>
Body: {
  "name": "Áo Thun Nam Basic",
  "categoryId": 1,
  "brand": "Local Brand",
  "unit": "Cái",
  "description": "Áo thun cotton 100%",
  "option1Name": "Màu sắc",
  "option2Name": "Kích thước",
  "option3Name": null,
  "variants": [
    { "option1Value": "Đỏ", "option2Value": "M", "option3Value": null, "purchasePrice": 80000, "salePrice": 150000 },
    { "option1Value": "Đỏ", "option2Value": "L", "option3Value": null, "purchasePrice": 80000, "salePrice": 150000 },
    { "option1Value": "Xanh", "option2Value": "M", "option3Value": null, "purchasePrice": 85000, "salePrice": 160000 }
  ]
}

Expect:
- Status 201 Created
- Code sản phẩm tự sinh (dạng SP-YYMMDD-XXXX)
- SKU mỗi variant tự sinh (dạng SP-YYMMDD-XXXX-DO-M)
- quantityOnHand = 0 cho tất cả variants
- status = ACTIVE
```

### TC-PROD-005 — Tạo sản phẩm không có variants ❌
```
POST /api/v1/products
Authorization: Bearer <warehouse_staff_token>
Body: { "name": "Test", "categoryId": 1, ..., "variants": [] }

Expect: Status 400 (nếu có validation) hoặc tạo thành công nhưng không có variant
🔍 Kiểm tra xem backend có validate variants không rỗng không
```

### TC-PROD-006 — Tạo sản phẩm bởi non-warehouse-staff ❌
```
POST /api/v1/products
Authorization: Bearer <coordinator_token>
Body: { ... }

Expect: Status 403 Forbidden
```

### TC-PROD-007 — Tạo sản phẩm với categoryId không tồn tại ❌
```
POST /api/v1/products
Authorization: Bearer <warehouse_staff_token>
Body: { ..., "categoryId": 99999, ... }

Expect: Status 404 — Category not found
```

### TC-PROD-008 — Tạo sản phẩm với tên rỗng ❌
```
POST /api/v1/products
Authorization: Bearer <warehouse_staff_token>
Body: { "name": "", "categoryId": 1, "unit": "Cái", "variants": [...] }

Expect: Status 400 validation error
```

### TC-PROD-009 — Tạo sản phẩm với purchasePrice âm ❌
```
POST /api/v1/products
Authorization: Bearer <warehouse_staff_token>
Body: { ..., "variants": [{ ..., "purchasePrice": -1000, "salePrice": 100000 }] }

Expect: Status 400 hoặc chấp nhận (🔍 kiểm tra validation)
```

### TC-PROD-010 — Cập nhật sản phẩm (chưa có giao dịch) ✅
```
PUT /api/v1/products/{id}
Authorization: Bearer <warehouse_staff_token>
Body: {
  "name": "Áo Thun Nam Basic Updated",
  "brand": "New Brand",
  "status": "ACTIVE",
  "variants": [
    { "id": <variant_id>, "option1Value": "Đen", "option2Value": "S", "purchasePrice": 90000, "salePrice": 170000, "status": "ACTIVE" }
  ]
}

Expect:
- Status 200
- Thông tin được cập nhật
- SKU tự sinh lại nếu option value thay đổi
```

### TC-PROD-011 — Cập nhật option value của variant ĐÃ có giao dịch ❌
```
Điều kiện: Variant đã có trong purchase_order_details
PUT /api/v1/products/{id}
Authorization: Bearer <warehouse_staff_token>
Body: { ..., "variants": [{ "id": <variant_with_transaction>, "option1Value": "MÀU KHÁC", ... }] }

Expect: Status 400 — CANNOT_UPDATE_VARIANT_HAS_TRANSACTIONS
```

### TC-PROD-012 — Cập nhật price/status của variant ĐÃ có giao dịch ✅
```
Điều kiện: Variant đã có trong purchase_order_details
PUT /api/v1/products/{id}
Authorization: Bearer <warehouse_staff_token>
Body: { ..., "variants": [{ "id": <variant_with_transaction>, "option1Value": "GIỮ NGUYÊN", "purchasePrice": 95000, "status": "INACTIVE" }] }

Expect: Status 200 — chỉ price và status được phép sửa
```

### TC-PROD-013 — Xóa sản phẩm (soft delete) ✅
```
DELETE /api/v1/products/{id}
Authorization: Bearer <warehouse_staff_token>

Expect:
- Status 204 No Content
- Sản phẩm không xuất hiện trong GET /products
- Tất cả variants của sản phẩm đó cũng status = DELETED
```

### TC-PROD-014 — Xóa sản phẩm không tồn tại ❌
```
DELETE /api/v1/products/99999
Authorization: Bearer <warehouse_staff_token>

Expect: Status 404
```

### TC-PROD-015 — Xóa nhiều variants ✅
```
DELETE /api/v1/products/variants
Authorization: Bearer <warehouse_staff_token>
Body: { "variantIds": [1, 2, 3] }

Expect:
- Status 204
- Các variants có status = DELETED
- 🔍 Nếu tất cả variants của product bị xóa → product tự INACTIVE?
```

### TC-PROD-016 — Xóa variant với ID không tồn tại (trong danh sách) ❌
```
DELETE /api/v1/products/variants
Authorization: Bearer <warehouse_staff_token>
Body: { "variantIds": [1, 99999] }

Expect: Status 404 — một trong các variant không tồn tại
```

### TC-PROD-017 — Cập nhật giá hàng loạt ✅
```
PUT /api/v1/products/variants/bulk-update-price
Authorization: Bearer <warehouse_staff_token>
Body: {
  "variantIds": [1, 2, 3],
  "purchasePrice": 100000,
  "salePrice": 200000
}

Expect:
- Status 200
- Tất cả variants được cập nhật giá
- 🔍 Nếu 1 variant đã có giao dịch → báo lỗi hay bỏ qua?
```

### TC-PROD-018 — Bulk update với variant đã có giao dịch ❌
```
PUT /api/v1/products/variants/bulk-update-price
Authorization: Bearer <warehouse_staff_token>
Body: { "variantIds": [<variant_with_transaction>], "purchasePrice": 100000 }

Expect: Status 400 — CANNOT_UPDATE_VARIANT_HAS_TRANSACTIONS
```

### TC-PROD-019 — Bulk update không có field nào để sửa 🔍
```
PUT /api/v1/products/variants/bulk-update-price
Authorization: Bearer <warehouse_staff_token>
Body: { "variantIds": [1, 2] }
(Không có purchasePrice, salePrice, status)

Expect: Status 200, trả về [] (danh sách rỗng theo code)
```

### TC-PROD-020 — Lấy danh sách variants ✅
```
GET /api/v1/products/variants
Authorization: Bearer <any_valid_token>

Expect:
- Status 200
- Không có DELETED variants
- Mỗi item có: variantId, sku, productName, categoryName, purchasePrice, salePrice, quantityOnHand
```

### TC-PROD-021 — Cập nhật tồn kho variant (adjustment) ✅
```
PUT /api/v1/products/variants/{variantId}
Authorization: Bearer <warehouse_staff_token>
Body: {
  "option1Value": "Đỏ", "option2Value": "M", "option3Value": null,
  "purchasePrice": 80000, "salePrice": 150000, "status": "ACTIVE",
  "quantityOnHand": 50,
  "adjustReason": "Kiểm kê định kỳ"
}

Expect:
- Status 200
- quantityOnHand = 50
- Có InventoryTransaction loại ADJUSTMENT được tạo
```

### TC-PROD-022 — syncParentStatus: Tất cả variants INACTIVE → Product INACTIVE ✅
```
1. Có product với nhiều variants
2. PATCH tất cả variants sang status = INACTIVE

Expect: Product.status tự động chuyển sang INACTIVE
```

### TC-PROD-023 — syncParentStatus: Ít nhất 1 variant ACTIVE → Product ACTIVE ✅
```
1. Có product status INACTIVE
2. Thêm 1 variant mới (ACTIVE)

Expect: Product.status chuyển lại ACTIVE
```

### TC-PROD-024 — Sắp xếp sản phẩm theo trường không hợp lệ (SQL injection test) ✅
```
GET /api/v1/products?sortBy=DROP TABLE products&sortDirection=desc

Expect:
- Status 200, không bị lỗi
- Mặc định sort theo createdAt (vì sortBy không nằm trong ALLOWED_SORT_FIELDS)
```

---

## 4. SUPPLIER — Quản lý Nhà cung cấp

### TC-SUP-001 — Lấy danh sách nhà cung cấp ✅
```
GET /api/v1/suppliers
Authorization: Bearer <any_valid_token>

Expect:
- Status 200
- Không có supplier status = DELETED
- Phân trang chuẩn
```

### TC-SUP-002 — Tìm kiếm theo tên/email/phone/code ✅
```
GET /api/v1/suppliers?keyword=0901
Authorization: Bearer <any_valid_token>

Expect: Trả về supplier có code/name/email/phone chứa "0901"
```

### TC-SUP-003 — Tạo nhà cung cấp mới ✅
```
POST /api/v1/suppliers
Authorization: Bearer <store_keeper_token>
Body: {
  "name": "Công ty TNHH Vải ABC",
  "contactPerson": "Nguyễn Văn B",
  "phone": "0909000111",
  "email": "abc@vaicomp.vn",
  "address": "123 Đường Lê Lợi, TP.HCM",
  "taxCode": "0123456789",
  "note": "Nhà cung cấp vải cao cấp"
}

Expect:
- Status 200
- Code tự sinh (dạng NCC-YYMMDD-XXXX)
- status = ACTIVE
```

### TC-SUP-004 — Tạo supplier với email đã tồn tại ❌
```
POST /api/v1/suppliers
Authorization: Bearer <store_keeper_token>
Body: { ..., "email": "<email_đã_có>" }

Expect: Status 409 — CONFLICT_SUPPLIER_EMAIL
```

### TC-SUP-005 — Tạo supplier với phone đã tồn tại ❌
```
POST /api/v1/suppliers
Authorization: Bearer <store_keeper_token>
Body: { ..., "phone": "<phone_đã_có>" }

Expect: Status 409 — CONFLICT_SUPPLIER_PHONE
```

### TC-SUP-006 — Tạo supplier với mã số thuế đã tồn tại ❌
```
POST /api/v1/suppliers
Authorization: Bearer <store_keeper_token>
Body: { ..., "taxCode": "<taxCode_đã_có>" }

Expect: Status 409 — CONFLICT_SUPPLIER_TAX_CODE
```

### TC-SUP-007 — Tạo supplier bởi non-store-keeper ❌
```
POST /api/v1/suppliers
Authorization: Bearer <coordinator_token>
Body: { ... }

Expect: Status 403 Forbidden
```

### TC-SUP-008 — Tạo supplier không có name ❌
```
POST /api/v1/suppliers
Authorization: Bearer <store_keeper_token>
Body: { "phone": "0909000111" }

Expect: Status 400 validation error
🔍 Kiểm tra xem "name" có được validate @NotBlank không
```

### TC-SUP-009 — Cập nhật supplier (PUT) ✅
```
PUT /api/v1/suppliers/{code}
Authorization: Bearer <store_keeper_token>
Body: {
  "name": "Công ty TNHH Vải ABC Updated",
  "phone": "0909000222"
}

Expect: Status 200, thông tin được cập nhật
```

### TC-SUP-010 — Cập nhật supplier với phone của supplier khác ❌
```
PUT /api/v1/suppliers/{code}
Authorization: Bearer <store_keeper_token>
Body: { "phone": "<phone_của_supplier_khác>" }

Expect: Status 409 — CONFLICT_SUPPLIER_PHONE
```

### TC-SUP-011 — Cập nhật supplier với phone của chính mình ✅
```
PUT /api/v1/suppliers/{code}
Authorization: Bearer <store_keeper_token>
Body: { "phone": "<phone_của_chính_supplier_này>" }

Expect: Status 200 — không báo lỗi trùng (đúng logic)
```

### TC-SUP-012 — Xóa supplier (soft delete) ✅
```
DELETE /api/v1/suppliers/{code}
Authorization: Bearer <store_keeper_token>

Expect:
- Status 204
- Supplier không xuất hiện trong GET /suppliers
- status = DELETED trong DB
```

### TC-SUP-013 — Xóa supplier không tồn tại ❌
```
DELETE /api/v1/suppliers/NCC-NOTEXIST-9999
Authorization: Bearer <store_keeper_token>

Expect: Status 404
```

### TC-SUP-014 — Tạo đơn hàng với supplier đã bị xóa ❌
```
Điều kiện: Supplier với id X đã bị DELETED
POST /api/v1/purchase-orders
Body: { "supplierId": X, ... }

Expect: Status 404 — Supplier not found
🔍 Kiểm tra xem supplier đã xóa có còn findById trả về không
```

---

## 5. PURCHASE ORDER — Đơn đặt hàng

### TC-PO-001 — Lấy danh sách đơn đặt hàng ✅
```
GET /api/v1/purchase-orders
Authorization: Bearer <any_valid_token>

Expect:
- Status 200
- Không có đơn status = CANCELLED trong kết quả
- Phân trang, sort theo createdAt desc
```

### TC-PO-002 — Tạo đơn đặt hàng ✅
```
POST /api/v1/purchase-orders
Authorization: Bearer <coordinator_token>
Body: {
  "code": "DDH-2024-0001",
  "supplierId": 1,
  "orderDate": "2024-07-05T10:00:00",
  "note": "Đơn đặt hàng tháng 7",
  "details": [
    { "variantId": 1, "quantity": 100, "unitPrice": 80000 },
    { "variantId": 2, "quantity": 50, "unitPrice": 85000 }
  ]
}

Expect:
- Status 200
- status = DRAFT
- paymentStatus = UNPAID
- totalAmount = 100*80000 + 50*85000 = 12250000
- createdBy = user đang đăng nhập
```

### TC-PO-003 — Tạo đơn với supplierId không tồn tại ❌
```
POST /api/v1/purchase-orders
Authorization: Bearer <coordinator_token>
Body: { ..., "supplierId": 99999 }

Expect: Status 404 — Supplier not found
```

### TC-PO-004 — Tạo đơn với variantId không tồn tại ❌
```
POST /api/v1/purchase-orders
Authorization: Bearer <coordinator_token>
Body: { ..., "details": [{ "variantId": 99999, "quantity": 10, "unitPrice": 50000 }] }

Expect: Status 404 — Variant not found
```

### TC-PO-005 — Tạo đơn với details rỗng 🔍
```
POST /api/v1/purchase-orders
Authorization: Bearer <coordinator_token>
Body: { ..., "details": [] }

Expect: Status 400 (nếu validate) hoặc tạo thành công với totalAmount = 0
🔍 Kiểm tra có validation @NotEmpty cho details không
```

### TC-PO-006 — Tạo đơn với quantity = 0 ❌
```
POST /api/v1/purchase-orders
Body: { ..., "details": [{ "variantId": 1, "quantity": 0, "unitPrice": 80000 }] }

Expect: Status 400 — quantity phải > 0
🔍 Kiểm tra validation trên DTO
```

### TC-PO-007 — Tạo đơn với unitPrice âm ❌
```
POST /api/v1/purchase-orders
Body: { ..., "details": [{ "variantId": 1, "quantity": 10, "unitPrice": -1000 }] }

Expect: Status 400 validation error
```

### TC-PO-008 — Cập nhật đơn ở trạng thái DRAFT ✅
```
Điều kiện: Đơn đang ở DRAFT
PUT /api/v1/purchase-orders/{id}
Authorization: Bearer <coordinator_token>
Body: {
  "supplierId": 1,
  "details": [{ "variantId": 3, "quantity": 200, "unitPrice": 90000 }]
}

Expect:
- Status 200
- Details cũ bị xóa, details mới được thêm vào
- totalAmount tính lại
```

### TC-PO-009 — Cập nhật đơn ở trạng thái PENDING ❌
```
Điều kiện: Đơn đang ở PENDING
PUT /api/v1/purchase-orders/{id}
Body: { ... }

Expect: Status 400 — PURCHASE_ORDER_CANNOT_BE_MODIFIED
```

### TC-PO-010 — Chuyển trạng thái DRAFT → PENDING ✅
```
PATCH /api/v1/purchase-orders/{id}/status
Authorization: Bearer <coordinator_token>
Body: { "status": "PENDING" }

Expect: Status 200, đơn chuyển sang PENDING
```

### TC-PO-011 — Chuyển trạng thái PENDING → RECEIVED ✅
```
Điều kiện: Đơn đang ở PENDING
PATCH /api/v1/purchase-orders/{id}/status
Body: { "status": "RECEIVED" }

Expect:
- Status 200
- Đơn chuyển sang RECEIVED
- receivedDate được set
- quantityOnHand của từng variant TĂNG lên theo quantity trong đơn
- InventoryTransaction (type=IN) được tạo cho từng dòng
```

### TC-PO-012 — Chuyển trạng thái DRAFT → RECEIVED (bỏ qua PENDING) ❌
```
Điều kiện: Đơn đang ở DRAFT
PATCH /api/v1/purchase-orders/{id}/status
Body: { "status": "RECEIVED" }

Expect: Status 400 — INVALID_PURCHASE_ORDER_STATUS_TRANSITION
```

### TC-PO-013 — Chuyển trạng thái RECEIVED → bất kỳ ❌
```
Điều kiện: Đơn đang ở RECEIVED
PATCH /api/v1/purchase-orders/{id}/status
Body: { "status": "DRAFT" }  OR  { "status": "PENDING" }  OR  { "status": "CANCELLED" }

Expect: Status 400 — INVALID_PURCHASE_ORDER_STATUS_TRANSITION
```

### TC-PO-014 — Huỷ đơn từ DRAFT ✅
```
Điều kiện: Đơn đang ở DRAFT
PATCH /api/v1/purchase-orders/{id}/status
Body: { "status": "CANCELLED" }

Expect:
- Status 200
- Đơn status = CANCELLED
- Đơn KHÔNG xuất hiện trong GET /purchase-orders (bị lọc)
```

### TC-PO-015 — Huỷ đơn từ PENDING ✅
```
Điều kiện: Đơn đang ở PENDING
PATCH /api/v1/purchase-orders/{id}/status
Body: { "status": "CANCELLED" }

Expect: Status 200, CANCELLED
```

### TC-PO-016 — Lấy phiếu nhập kho (received orders) ✅
```
GET /api/v1/purchase-orders/received
Authorization: Bearer <any_valid_token>

Expect:
- Chỉ trả về đơn có status = RECEIVED
```

### TC-PO-017 — Lấy chi tiết đơn theo ID ✅
```
GET /api/v1/purchase-orders/{id}
Authorization: Bearer <any_valid_token>

Expect:
- Status 200
- Có đầy đủ details với sku, productName, quantity, unitPrice, lineTotal
```

### TC-PO-018 — Lấy chi tiết đơn không tồn tại ❌
```
GET /api/v1/purchase-orders/99999

Expect: Status 404
```

### TC-PO-019 — Tạo 2 đơn với cùng code ❌
```
POST /api/v1/purchase-orders (body với "code": "DDH-DUPLICATE")
POST /api/v1/purchase-orders (body với "code": "DDH-DUPLICATE")

Expect lần 2: Status 409 — duplicate key (code là unique)
🔍 Kiểm tra DB constraint hoặc service validation
```

### TC-PO-020 — Verify tồn kho sau khi RECEIVED ✅
```
1. Variant V1 có quantityOnHand = 10
2. Tạo đơn với V1, quantity = 50
3. DRAFT → PENDING → RECEIVED

Verify:
GET /api/v1/products → V1.quantityOnHand = 60
GET /api/v1/inventory-transactions → có record type=IN, quantity=50 cho V1
```

---

## 6. PAYMENT — Thanh toán

### TC-PAY-001 — Thanh toán một phần ✅
```
Điều kiện: Đơn RECEIVED, totalAmount = 12250000, chưa thanh toán
POST /api/v1/payments
Authorization: Bearer <any_valid_token>
Body: {
  "purchaseOrderId": 1,
  "paymentMethodId": 1,
  "paymentDate": "2024-07-05T14:00:00",
  "amount": 5000000,
  "note": "Thanh toán đợt 1"
}

Expect:
- Status 201
- purchaseOrder.paymentStatus = PARTIALLY_PAID
- remainingAmount = 7250000
- totalPaidAmount = 5000000
```

### TC-PAY-002 — Thanh toán đủ toàn bộ ✅
```
Điều kiện: Đơn còn lại 7250000 chưa thanh toán
POST /api/v1/payments
Body: { ..., "amount": 7250000 }

Expect:
- Status 201
- purchaseOrder.paymentStatus = PAID
- remainingAmount = 0
```

### TC-PAY-003 — Thanh toán vượt số tiền còn lại ❌
```
POST /api/v1/payments
Body: { ..., "amount": 99999999 }  ← Lớn hơn số tiền còn lại

Expect: Status 400 — PAYMENT_AMOUNT_EXCEEDS_REMAINING
```

### TC-PAY-004 — Thanh toán với amount = 0 ❌
```
POST /api/v1/payments
Body: { ..., "amount": 0 }

Expect: Status 400 validation error
🔍 Kiểm tra @Min(1) hoặc @Positive trên DTO
```

### TC-PAY-005 — Thanh toán với amount âm ❌
```
POST /api/v1/payments
Body: { ..., "amount": -1000 }

Expect: Status 400 validation error
```

### TC-PAY-006 — Thanh toán đơn không tồn tại ❌
```
POST /api/v1/payments
Body: { "purchaseOrderId": 99999, "paymentMethodId": 1, "amount": 1000 }

Expect: Status 404 — Purchase order not found
```

### TC-PAY-007 — Thanh toán với paymentMethodId không tồn tại ❌
```
POST /api/v1/payments
Body: { "purchaseOrderId": 1, "paymentMethodId": 99999, "amount": 1000 }

Expect: Status 404 — Payment method not found
```

### TC-PAY-008 — Lấy lịch sử thanh toán của đơn ✅
```
GET /api/v1/payments/purchase-order/{purchaseOrderId}
Authorization: Bearer <coordinator_token>

Expect:
- Status 200
- Danh sách các lần thanh toán
- totalPaidAmount, remainingAmount chính xác
```

### TC-PAY-009 — Lấy lịch sử thanh toán (non-coordinator) ❌
```
GET /api/v1/payments/purchase-order/{id}
Authorization: Bearer <warehouse_staff_token>

Expect: Status 403 Forbidden
```

### TC-PAY-010 — Thanh toán đơn DRAFT (chưa RECEIVED) 🔍
```
POST /api/v1/payments
Body: { "purchaseOrderId": <id_đơn_DRAFT>, ... }

Expect:
🔍 Backend không validate trạng thái đơn khi thanh toán
   → Có thể thanh toán ngay cả khi đơn chưa RECEIVED
   → Đây có thể là BUG
```

---

## 7. INVENTORY TRANSACTION — Lịch sử tồn kho

### TC-INV-001 — Lấy lịch sử giao dịch tồn kho ✅
```
GET /api/v1/inventory-transactions
Authorization: Bearer <any_valid_token>

Expect:
- Status 200
- Gồm cả type=IN (từ purchase order) và type=ADJUSTMENT (từ manual update)
```

### TC-INV-002 — Verify giao dịch sau nhập kho ✅
```
Sau khi đơn RECEIVED:
GET /api/v1/inventory-transactions

Expect:
- Có bản ghi transactionType = "IN"
- quantityBefore + quantity = quantityAfter
- note chứa code của đơn đặt hàng
```

### TC-INV-003 — Verify giao dịch sau điều chỉnh tồn kho ✅
```
Sau khi PUT /products/variants/{id} với quantityOnHand mới:
GET /api/v1/inventory-transactions

Expect:
- Có bản ghi transactionType = "ADJUSTMENT"
- quantity = quantityAfter - quantityBefore (có thể âm nếu giảm)
- note = adjustReason đã truyền vào
```

---

## 8. SECURITY & AUTHORIZATION

### TC-SEC-001 — Truy cập API không có token ❌
```
GET /api/v1/products (không có header Authorization)

Expect: Status 401 Unauthorized
```

### TC-SEC-002 — Truy cập API với token sai định dạng ❌
```
GET /api/v1/products
Authorization: Bearer not_a_jwt_token

Expect: Status 401
```

### TC-SEC-003 — Warehouse-staff thử tạo supplier ❌
```
POST /api/v1/suppliers
Authorization: Bearer <warehouse_staff_token>

Expect: Status 403 Forbidden
```

### TC-SEC-004 — Coordinator thử xóa product ❌
```
DELETE /api/v1/products/1
Authorization: Bearer <coordinator_token>

Expect: Status 403 Forbidden
```

### TC-SEC-005 — Store-keeper thử tạo product ❌
```
POST /api/v1/products
Authorization: Bearer <store_keeper_token>

Expect: Status 403 Forbidden
```

### TC-SEC-006 — Non-admin thử xem danh sách users ❌
```
GET /api/v1/users
Authorization: Bearer <warehouse_staff_token>

Expect: Status 403 Forbidden
```

### TC-SEC-007 — Token của user bị INACTIVE vẫn còn hạn 🔍
```
1. User A đăng nhập → có accessToken (còn hạn)
2. Admin vô hiệu hóa User A (status = INACTIVE)
3. User A gọi API với accessToken cũ

Expect:
🔍 accessToken vẫn hợp lệ về mặt JWT signature
   → Backend chỉ check INACTIVE khi login/refresh
   → Token cũ vẫn hoạt động cho đến khi hết hạn
   → Đây là behavior có chủ đích hay BUG?
```

### TC-SEC-008 — Refresh Token sau khi bị INACTIVE ❌
```
1. User INACTIVE rồi thử POST /auth/refresh-token

Expect: Status 401/403 — INACTIVE check trong refreshAccessToken
```

### TC-SEC-009 — CORS từ domain không được phép ❌
```
Gửi request từ origin http://evil.com đến API

Expect: CORS error (blocked by browser)
```

---

## 9. FRONTEND UI FLOWS

### TC-UI-001 — Đăng nhập thành công
```
1. Mở http://localhost:5173/login
2. Nhập đúng username/password
3. Click Đăng nhập

Expect:
- Redirect sang trang chính
- Sidebar hiển thị đúng theo role của user
- Không có route của role khác trong sidebar
```

### TC-UI-002 — Đăng nhập sai thông tin
```
1. Nhập username/password sai
2. Click Đăng nhập

Expect:
- Hiển thị thông báo lỗi (Toast)
- Không redirect
- Vẫn ở trang login
```

### TC-UI-003 — Admin chỉ thấy menu Admin
```
Đăng nhập bằng tài khoản Admin

Expect:
- Thấy "Tổng quan hệ thống" và "Quản lý tài khoản"
- KHÔNG thấy menu Coordinator/WarehouseStaff/StoreKeeper
```

### TC-UI-004 — Truy cập route không thuộc role → Redirect login
```
Đăng nhập bằng coordinator
Thử truy cập http://localhost:5173/admin/users

Expect:
- Redirect về /login (theo App.tsx: route * → /login)
🔍 Đây là security issue: không redirect /403 mà redirect /login
```

### TC-UI-005 — Tự động refresh token khi accessToken hết hạn
```
1. Đăng nhập
2. Chờ accessToken hết hạn (không đăng xuất)
3. Gọi bất kỳ API nào

Expect:
- Frontend tự động gọi /auth/refresh-token
- Request gốc được retry với token mới
- User không bị đăng xuất
- Không có lỗi hiển thị
```

### TC-UI-006 — Session hết hạn hoàn toàn → Về Login
```
1. Đăng nhập
2. Chờ cả accessToken và refreshToken hết hạn
3. Thực hiện thao tác bất kỳ

Expect:
- Frontend redirect về /login
- localStorage được clear
```

### TC-UI-007 — Trang Products: Tìm kiếm debounce
```
1. Vào /warehouse/products
2. Gõ từng ký tự vào ô tìm kiếm nhanh

Expect:
- Không gọi API sau mỗi phím gõ ngay lập tức
- Chờ khoảng 300-500ms sau khi dừng gõ mới gọi API (debounce)
```

### TC-UI-008 — Trang Products: Phân trang
```
1. Vào /warehouse/products
2. Click trang 2, trang 3...

Expect:
- Danh sách thay đổi theo trang
- Không có sản phẩm trùng lặp giữa các trang
```

### TC-UI-009 — Tạo sản phẩm: Validation form
```
1. Vào /warehouse/products/create
2. Click Submit mà không điền gì

Expect:
- Hiển thị lỗi validation cho các field bắt buộc
- Không gọi API
```

### TC-UI-010 — Tạo sản phẩm: Thêm/xóa variants trong form
```
1. Thêm option "Màu sắc" và "Kích thước"
2. Nhập giá trị cho các option
3. Hệ thống tự tạo combinations variants

Expect:
- Combinations variants được generate đúng
- Có thể điền giá cho từng variant
```

### TC-UI-011 — Unsaved Changes Warning
```
1. Vào trang CreateProduct hoặc edit
2. Điền một số thông tin
3. Click Back / navigate sang trang khác

Expect:
- Hiện cảnh báo "Bạn có thay đổi chưa lưu..."
- Click Cancel → ở lại trang
- Click OK → rời trang
```

### TC-UI-012 — Toast notification sau thao tác
```
1. Tạo sản phẩm thành công

Expect:
- Hiển thị Toast "Tạo thành công" (success)
- Toast tự biến mất sau vài giây
```

### TC-UI-013 — Coordinator: Tạo đơn đặt hàng
```
1. Vào /coordinator/purchase-order
2. Click Tạo đơn mới
3. Chọn nhà cung cấp
4. Thêm sản phẩm (variant) và số lượng
5. Submit

Expect:
- Đơn được tạo với status DRAFT
- Xuất hiện trong danh sách
```

### TC-UI-014 — Coordinator: Flow duyệt đơn → Nhập kho
```
1. Đơn ở DRAFT → Click "Duyệt" → PENDING
2. Đơn ở PENDING → Click "Nhận hàng" → RECEIVED
3. Kiểm tra: Số lượng variant tăng lên
4. Đơn xuất hiện trong tab Phiếu nhập kho

Expect: Tất cả bước thành công và dữ liệu nhất quán
```

### TC-UI-015 — Admin: Quản lý tài khoản
```
1. Vào /admin/users
2. Tìm kiếm user
3. Cập nhật role
4. Vô hiệu hóa user

Expect:
- Tất cả thao tác gọi đúng API
- Danh sách refresh sau khi thay đổi
- Không có user có role "admin" trong danh sách
```

### TC-UI-016 — Logout
```
1. Click nút Logout

Expect:
- Gọi POST /auth/logout
- Clear localStorage (accessToken, currentUser)
- Redirect về /login
- Không thể truy cập trang cũ bằng Back button
```

---

## 10. EDGE CASES & BOUNDARY

### TC-EDGE-001 — SQL Injection qua keyword ✅
```
GET /api/v1/products?keyword=' OR '1'='1
GET /api/v1/suppliers?keyword='; DROP TABLE suppliers; --

Expect:
- Status 200 với kết quả rỗng hoặc không tìm thấy
- DB không bị ảnh hưởng (JPA Specification dùng parameterized query)
```

### TC-EDGE-002 — XSS trong field text
```
POST /api/v1/suppliers
Body: { "name": "<script>alert('xss')</script>", ... }

Expect:
- Được lưu vào DB dưới dạng plain text (escaped)
- Khi hiển thị ở frontend không execute script
```

### TC-EDGE-003 — Tạo rất nhiều variants (stress test) 🔍
```
POST /api/v1/products
Body: { ..., "variants": [100 variants] }

Expect: Tạo thành công hoặc lỗi timeout
🔍 Kiểm tra giới hạn số lượng variants có được validate không
```

### TC-EDGE-004 — Unicode trong tên sản phẩm ✅
```
POST /api/v1/products
Body: { "name": "Áo Dài Phụ Nữ 旗袍 ビキニ", ... }

Expect: Lưu và hiển thị chính xác, SKU sinh ra được slugify đúng
```

### TC-EDGE-005 — SKU sinh từ option có dấu Tiếng Việt ✅
```
POST /api/v1/products
Body: { ..., "variants": [{ "option1Value": "Màu Đỏ Tươi", "option2Value": "Cỡ Lớn XL" }] }

Expect:
SKU = "SP-YYMMDD-XXXX-MAU-DO-TUOI-CO-LON-XL" (slugified, uppercase)
```

### TC-EDGE-006 — Concurrent purchase (Race condition) 🔍
```
Variant V1 có quantityOnHand = 0
Đồng thời 2 đơn cùng RECEIVED với V1, quantity=10

Expect:
- quantityOnHand = 20 (không bị lost update)
- findByIdForUpdate() dùng pessimistic lock → ngăn race condition
🔍 Kiểm tra bằng cách gửi 2 request đồng thời
```

### TC-EDGE-007 — Thanh toán song song (Race condition) 🔍
```
Đơn còn remainingAmount = 5000000
Đồng thời 2 payment request với amount = 4000000

Expect:
- Tổng thanh toán = 5000000 (không exceed)
- findByIdForUpdate() trong PaymentService ngăn race condition
```

### TC-EDGE-008 — Page number rất lớn ✅
```
GET /api/v1/products?page=999999

Expect: Status 200, items = [] (không có lỗi, chỉ trả về rỗng)
```

### TC-EDGE-009 — Keyword rất dài (performance) 🔍
```
GET /api/v1/products?keyword=<chuỗi_1000_ký_tự>

Expect: Status 200 hoặc 400 (nếu có giới hạn độ dài keyword)
```

### TC-EDGE-010 — Tạo đơn với details trùng variantId 🔍
```
POST /api/v1/purchase-orders
Body: {
  "details": [
    { "variantId": 1, "quantity": 10, "unitPrice": 80000 },
    { "variantId": 1, "quantity": 20, "unitPrice": 80000 }
  ]
}

Expect:
🔍 Có 2 dòng với cùng variantId → totalAmount = 30*80000
   Backend không validate duplicate variantId trong 1 đơn
   → Có thể là intended behavior hoặc bug
```

### TC-EDGE-011 — Xóa variant đang có trong đơn chưa nhập ❌ 🔍
```
Điều kiện: Variant V1 đang nằm trong đơn PENDING
DELETE /api/v1/products/variants { "variantIds": [V1_id] }

Expect:
🔍 Backend set status=DELETED nhưng không kiểm tra đơn đang dùng variant
   → Đơn PENDING vẫn có dòng với variant DELETED
   → Khi RECEIVED, variant DELETED vẫn được cộng tồn kho
   → Đây là potential BUG
```

### TC-EDGE-012 — Sắp xếp theo totalQuantity (Hibernate Formula) ✅
```
GET /api/v1/purchase-orders?sortBy=totalQuantity&sortDirection=desc

Expect:
- Status 200
- Đơn có nhiều sản phẩm nhất lên đầu
- @Formula dùng subquery → kiểm tra performance
```

### TC-EDGE-013 — Đăng nhập nhiều lần (multiple sessions) 🔍
```
1. User A đăng nhập từ device 1 → refreshToken1 lưu Redis
2. User A đăng nhập từ device 2 → refreshToken2 lưu Redis
3. User A logout từ device 1

Expect:
🔍 Kiểm tra xem Redis lưu refresh token theo dạng gì:
   - Nếu là 1 key per user → logout device 1 xóa hết token của cả device 2
   - Nếu là Set/List → logout device 1 chỉ xóa token của device 1
```

### TC-EDGE-014 — Cập nhật email thành chuỗi không phải email ❌
```
PATCH /api/v1/users/{uuid}
Body: { "email": "not_an_email" }

Expect: Status 400 — email format validation
🔍 Kiểm tra có @Email annotation trên UserUpdateRequestDto không
```

### TC-EDGE-015 — Verify syncParentStatus khi xóa tất cả variants ✅
```
1. Product P có 2 variants V1, V2
2. DELETE /products/variants { "variantIds": [V1_id, V2_id] }

Expect:
- V1, V2 status = DELETED
- syncParentStatus: tất cả non-deleted variants = [] → allVariantsInactive = true
  (vì filter DELETED rồi allMatch INACTIVE → true với tập rỗng)
- Product.status = INACTIVE
🔍 allMatch() trên stream rỗng trả về TRUE trong Java → Product bị INACTIVE
```

---

## 📋 TEST EXECUTION CHECKLIST

### Chuẩn bị data test
- [ ] Có ít nhất 1 user admin
- [ ] Có ít nhất 1 user mỗi role: coordinator, warehouse-staff, store-keeper
- [ ] Có ít nhất 1 category
- [ ] Có ít nhất 1 payment method
- [ ] Backend đang chạy (port 8080)
- [ ] Frontend đang chạy (port 5173)
- [ ] Redis và MySQL đang chạy

### Thứ tự test khuyến nghị
```
1. AUTH tests (TC-AUTH-*)      ← Cần có token trước
2. USER tests (TC-USER-*)      ← Cần admin token
3. SUPPLIER tests (TC-SUP-*)   ← Tạo supplier trước khi tạo đơn
4. PRODUCT tests (TC-PROD-*)   ← Tạo product + variant
5. PURCHASE ORDER (TC-PO-*)    ← Cần supplier + variant đã có
6. PAYMENT tests (TC-PAY-*)    ← Cần đơn RECEIVED
7. INVENTORY tests (TC-INV-*)  ← Verify sau PO received
8. SECURITY tests (TC-SEC-*)   ← Test với các role khác nhau
9. FRONTEND tests (TC-UI-*)    ← Test end-to-end qua UI
10. EDGE CASES (TC-EDGE-*)     ← Test sau khi core flow OK
```

### Ghi chú các lỗi tiềm năng (cần check kỹ)
| # | Mô tả | Test case |
|---|-------|-----------|
| 🐛 1 | Token người dùng INACTIVE vẫn hoạt động cho đến hết hạn | TC-SEC-007 |
| 🐛 2 | Thanh toán đơn DRAFT (chưa nhận hàng) không bị chặn | TC-PAY-010 |
| 🐛 3 | Xóa variant đang nằm trong đơn PENDING | TC-EDGE-011 |
| 🐛 4 | 2 dòng trùng variantId trong 1 đơn không bị validate | TC-EDGE-010 |
| 🐛 5 | WarehouseContext không sync backend (dữ liệu mất khi reload) | TC-UI-013 |
| 🐛 6 | Route không authorized redirect về /login thay vì /403 | TC-UI-004 |
| 🐛 7 | allMatch(INACTIVE) trên stream rỗng = true → Product INACTIVE | TC-EDGE-015 |
| 🐛 8 | Không validate details[] rỗng khi tạo đơn | TC-PO-005 |

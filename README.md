# 📦 Clothing Inventory Management System

Hệ thống quản lý kho hàng thời trang, gồm 2 phần tách biệt:
- **Backend**: REST API viết bằng Java Spring Boot
- **Frontend**: Single Page Application viết bằng React + TypeScript + Vite

---

## 🗂️ Cấu trúc tổng quan

```
clothing-inventory/
├── backend/     ← Spring Boot REST API
├── frontend/    ← React SPA
└── README.md
```

---

# 🖥️ BACKEND

## Tech Stack

| Thành phần       | Công nghệ                                |
|------------------|------------------------------------------|
| Language         | Java 17                                  |
| Framework        | Spring Boot 3.5                          |
| Database         | MySQL (Spring Data JPA / Hibernate)      |
| Cache            | Redis                                    |
| Authentication   | JWT (HS256) + Refresh Token (HttpOnly Cookie) |
| Security         | Spring Security + OAuth2 Resource Server |
| Build tool       | Maven                                    |
| Code generation  | Lombok, MapStruct                        |
| Validation       | Jakarta Bean Validation                  |

---

## Cấu trúc thư mục Backend

```
backend/
├── pom.xml                                          ← Cấu hình Maven, dependencies
├── mvnw / mvnw.cmd                                  ← Maven Wrapper script
└── src/
    ├── main/
    │   ├── resources/
    │   │   └── application.properties               ← Cấu hình app (dùng env vars)
    │   └── java/com/example/backend/
    │       ├── BackendApplication.java              ← Entry point, khởi động Spring Boot
    │       │
    │       ├── config/                              ← Cấu hình Spring Beans
    │       │   ├── CorsConfig.java                  ← Cho phép frontend gọi API (CORS)
    │       │   ├── JwtConfig.java                   ← Tạo JwtEncoder, JwtDecoder, PasswordEncoder
    │       │   └── SecurityConfig.java              ← Filter chain: public/protected routes, JWT auth
    │       │
    │       ├── controller/                          ← Tầng tiếp nhận HTTP request
    │       │   ├── AuthController.java              ← /api/v1/auth/*
    │       │   ├── UserController.java              ← /api/v1/users/*
    │       │   ├── ProductController.java           ← /api/v1/products/*
    │       │   ├── CategoryController.java          ← /api/v1/categories/*
    │       │   ├── SupplierController.java          ← /api/v1/suppliers/*
    │       │   ├── PurchaseOrderController.java     ← /api/v1/purchase-orders/*
    │       │   ├── PaymentController.java           ← /api/v1/payments/*
    │       │   ├── PaymentMethodController.java     ← /api/v1/payment-methods/*
    │       │   └── InventoryTransactionController.java ← /api/v1/inventory-transactions/*
    │       │
    │       ├── service/                             ← Tầng xử lý logic nghiệp vụ
    │       │   ├── AuthService.java                 ← Đăng nhập, đăng ký, refresh token
    │       │   ├── CacheService.java                ← Thao tác Redis (lưu/xóa refresh token)
    │       │   ├── UserService.java                 ← Quản lý tài khoản, phân quyền
    │       │   ├── ProductService.java              ← CRUD sản phẩm + biến thể (~21KB, lớn nhất)
    │       │   ├── CategoryService.java             ← Quản lý danh mục
    │       │   ├── SupplierService.java             ← Quản lý nhà cung cấp
    │       │   ├── PurchaseOrderService.java        ← Tạo/duyệt/nhận đơn đặt hàng
    │       │   ├── PaymentService.java              ← Ghi nhận thanh toán
    │       │   ├── PaymentMethodService.java        ← Quản lý phương thức thanh toán
    │       │   └── InventoryTransactionService.java ← Lịch sử giao dịch tồn kho
    │       │
    │       ├── model/                               ← JPA Entities (ánh xạ vào DB)
    │       │   ├── User.java                        ← Người dùng (uuid, username, password, roles)
    │       │   ├── Role.java                        ← Vai trò (admin, coordinator, warehouse-staff, store-keeper)
    │       │   ├── Product.java                     ← Sản phẩm (code, name, category, brand, options)
    │       │   ├── ProductVariant.java              ← Biến thể sản phẩm (sku, option values, giá, tồn kho)
    │       │   ├── Category.java                    ← Danh mục sản phẩm
    │       │   ├── Supplier.java                    ← Nhà cung cấp
    │       │   ├── PurchaseOrder.java               ← Đơn đặt hàng (code, supplier, status, totalAmount)
    │       │   ├── PurchaseOrderDetail.java         ← Chi tiết đơn (variant, quantity, unitPrice)
    │       │   ├── Payment.java                     ← Thanh toán (amount, method, purchaseOrder)
    │       │   ├── PaymentMethod.java               ← Phương thức thanh toán
    │       │   ├── InventoryTransaction.java        ← Giao dịch tồn kho (nhập/xuất)
    │       │   └── enums/
    │       │       ├── PurchaseOrderStatus.java     ← DRAFT | PENDING | RECEIVED | CANCELLED
    │       │       ├── PurchaseOrderPaymentStatus.java ← UNPAID | PARTIAL | PAID
    │       │       └── Status.java                  ← ACTIVE | INACTIVE | DELETED
    │       │
    │       ├── dto/                                 ← Data Transfer Objects (tách model khỏi API)
    │       │   ├── request/  (16 file)              ← Dữ liệu nhận từ client
    │       │   │   ├── AuthRequestDto.java
    │       │   │   ├── ProductCreateRequestDto.java
    │       │   │   ├── ProductUpdateRequestDto.java
    │       │   │   ├── VariantCreateRequestDto.java
    │       │   │   ├── VariantUpdateRequestDto.java
    │       │   │   ├── VariantBulkPriceUpdateRequestDto.java
    │       │   │   ├── VariantDeleteRequestDto.java
    │       │   │   ├── SupplierRequestDto.java
    │       │   │   ├── PurchaseOrderRequestDto.java
    │       │   │   ├── PurchaseOrderDetailRequestDto.java
    │       │   │   ├── PurchaseOrderStatusUpdateRequestDto.java
    │       │   │   ├── PaymentRequestDto.java
    │       │   │   ├── PaymentMethodRequestDto.java
    │       │   │   ├── CategoryRequestDto.java
    │       │   │   ├── UserUpdateRequestDto.java
    │       │   │   └── UserRoleUpdateRequestDto.java
    │       │   └── response/ (15 file)              ← Dữ liệu trả về client
    │       │       ├── AuthResponseDto.java
    │       │       ├── ProductResponseDto.java
    │       │       ├── ProductDetailResponseDto.java
    │       │       ├── ProductVariantDetailResponseDto.java
    │       │       ├── VariantResponseDto.java
    │       │       ├── SupplierResponseDto.java
    │       │       ├── PurchaseOrderResponseDto.java
    │       │       ├── PurchaseOrderDetailResponseDto.java
    │       │       ├── PaymentResponseDto.java
    │       │       ├── PaymentMethodResponseDto.java
    │       │       ├── CategoryResponseDto.java
    │       │       ├── TransactionResponseDto.java
    │       │       ├── UserResponseDto.java
    │       │       ├── PageResponseDto.java         ← Generic pagination wrapper
    │       │       └── FormatMessageResponseDto.java ← Wrapper lỗi chuẩn
    │       │
    │       ├── repository/  (11 file)               ← Spring Data JPA Repositories
    │       │   ├── UserRepository.java
    │       │   ├── RoleRepository.java
    │       │   ├── ProductRepository.java
    │       │   ├── ProductVariantRepository.java
    │       │   ├── CategoryRepository.java
    │       │   ├── SupplierRepository.java
    │       │   ├── PurchaseOrderRepository.java
    │       │   ├── PurchaseOrderDetailRepository.java
    │       │   ├── PaymentRepository.java
    │       │   ├── PaymentMethodRepository.java
    │       │   └── InventoryTransactionRepository.java
    │       │
    │       ├── mapper/                              ← MapStruct: tự động map Entity ↔ DTO
    │       │
    │       ├── security/
    │       │   ├── detail/                          ← UserDetailsService implementation
    │       │   ├── exception/                       ← AuthenticationEntryPoint, AccessDeniedHandler
    │       │   └── filter/                          ← Filter xử lý lỗi xác thực
    │       │
    │       ├── exception/                           ← Global Exception Handler (@ControllerAdvice)
    │       │
    │       └── util/                                ← JwtUtil (sign/verify token), helper functions
    │
    └── test/                                        ← Unit tests
```

---

## API Endpoints

> Tất cả đều có prefix `/api/v1/`. Public routes không cần token.

### 🔐 Auth — `/api/v1/auth`

| Method | Endpoint           | Phân quyền       | Mô tả                              |
|--------|--------------------|------------------|------------------------------------|
| POST   | `/login`           | Public           | Đăng nhập, trả về accessToken      |
| POST   | `/logout`          | Authenticated    | Đăng xuất, xóa refresh token Redis |
| POST   | `/refresh-token`   | Public (Cookie)  | Cấp lại accessToken mới            |
| POST   | `/register`        | `admin` only     | Tạo tài khoản mới                  |
| GET    | `/me`              | Authenticated    | Lấy thông tin user đang đăng nhập  |

### 👤 Users — `/api/v1/users`

| Method | Endpoint            | Phân quyền  | Mô tả                            |
|--------|---------------------|-------------|----------------------------------|
| GET    | `/`                 | `admin`     | Danh sách user (phân trang)      |
| PATCH  | `/{uuid}`           | `admin`     | Cập nhật thông tin user          |
| PUT    | `/{uuid}/roles`     | `admin`     | Cập nhật vai trò user            |

### 📦 Products — `/api/v1/products`

| Method | Endpoint                        | Phân quyền        | Mô tả                                  |
|--------|---------------------------------|-------------------|----------------------------------------|
| GET    | `/`                             | Authenticated     | Danh sách sản phẩm (filter, sort, page)|
| GET    | `/variants`                     | Authenticated     | Danh sách biến thể sản phẩm            |
| POST   | `/`                             | `warehouse-staff` | Tạo sản phẩm mới                       |
| PUT    | `/{id}`                         | `warehouse-staff` | Cập nhật sản phẩm                      |
| PUT    | `/variants/{id}`                | `warehouse-staff` | Cập nhật biến thể                      |
| PUT    | `/variants/bulk-update-price`   | `warehouse-staff` | Cập nhật giá hàng loạt                 |
| DELETE | `/{id}`                         | `warehouse-staff` | Xóa sản phẩm                           |
| DELETE | `/variants`                     | `warehouse-staff` | Xóa nhiều biến thể                     |

### 🏭 Suppliers — `/api/v1/suppliers`

| Method | Endpoint      | Phân quyền     | Mô tả                            |
|--------|---------------|----------------|----------------------------------|
| GET    | `/`           | Authenticated  | Danh sách nhà cung cấp           |
| POST   | `/`           | `store-keeper` | Tạo nhà cung cấp                 |
| PUT    | `/{code}`     | `store-keeper` | Cập nhật nhà cung cấp (full)     |
| PATCH  | `/{code}`     | `store-keeper` | Cập nhật nhà cung cấp (partial)  |
| DELETE | `/{code}`     | `store-keeper` | Xóa nhà cung cấp                 |

### 🛒 Purchase Orders — `/api/v1/purchase-orders`

| Method | Endpoint            | Mô tả                                              |
|--------|---------------------|----------------------------------------------------|
| GET    | `/`                 | Danh sách đơn đặt hàng (filter by keyword, status) |
| GET    | `/received`         | Danh sách phiếu nhập kho (đã nhận hàng)            |
| GET    | `/{id}`             | Chi tiết đơn đặt hàng                              |
| POST   | `/`                 | Tạo đơn đặt hàng mới                               |
| PUT    | `/{id}`             | Cập nhật đơn (chỉ khi đang ở trạng thái DRAFT)     |
| PATCH  | `/{id}/status`      | Cập nhật trạng thái đơn                            |

### 💳 Payments — `/api/v1/payments`

| Method | Endpoint                            | Phân quyền    | Mô tả                           |
|--------|-------------------------------------|---------------|---------------------------------|
| POST   | `/`                                 | Authenticated | Ghi nhận thanh toán             |
| GET    | `/purchase-order/{purchaseOrderId}` | `coordinator` | Lịch sử thanh toán theo đơn     |

### 🗂️ Các endpoint phụ

| Endpoint                        | Mô tả                              |
|---------------------------------|------------------------------------|
| GET `/categories`               | Danh sách danh mục sản phẩm        |
| POST `/categories`              | Tạo danh mục                       |
| GET `/payment-methods`          | Danh sách phương thức thanh toán   |
| GET `/inventory-transactions`   | Lịch sử giao dịch tồn kho         |

---

## Database Schema (quan hệ chính)

```
users ──────────── user_roles ──────────── roles
  │
  └── purchase_orders ──── purchase_order_details ──── product_variants ──── products
            │                                                  │                  │
            └── payments                              inventory_transactions  categories
                    │
             payment_methods
suppliers ──── purchase_orders
```

**Giải thích quan hệ:**
- `User` ↔ `Role`: Many-to-Many (qua bảng `user_roles`)
- `Product` → `Category`: Many-to-One
- `Product` → `ProductVariant`: One-to-Many (cascade ALL)
- `ProductVariant` → `PurchaseOrderDetail`: One-to-Many
- `ProductVariant` → `InventoryTransaction`: One-to-Many
- `PurchaseOrder` → `Supplier`: Many-to-One
- `PurchaseOrder` → `User` (createdBy): Many-to-One
- `Payment` → `PurchaseOrder`: Many-to-One

---

# 🌐 FRONTEND

## Tech Stack

| Thành phần   | Công nghệ                        |
|--------------|----------------------------------|
| Language     | TypeScript                       |
| Framework    | React 19                         |
| Build tool   | Vite 8                           |
| Router       | React Router DOM v7              |
| Styling      | Vanilla CSS                      |
| Icons        | Flaticon UIcons (`@flaticon/flaticon-uicons`) |
| State        | React Context API                |
| HTTP Client  | Native `fetch` (custom wrapper)  |

---

## Cấu trúc thư mục Frontend

```
frontend/
├── index.html                     ← HTML entry point
├── vite.config.ts                 ← Cấu hình Vite (dev server, build)
├── tsconfig.json                  ← TypeScript project references
├── tsconfig.app.json              ← TS config cho source code
├── eslint.config.js               ← ESLint rules
├── package.json                   ← Dependencies và scripts
└── src/
    ├── main.tsx                   ← Entry point React, mount <App/>
    ├── App.tsx                    ← Router config + Global Providers
    ├── index.css                  ← Global styles, CSS variables
    │
    ├── pages/                     ← Màn hình UI, phân theo Role
    │   ├── Login/
    │   │   └── Login.tsx          ← Trang đăng nhập
    │   ├── Dashboard/
    │   │   └── Dashboard.tsx      ← Trang tổng quan (Admin)
    │   ├── Profile/
    │   │   └── Profile.tsx        ← Trang thông tin cá nhân
    │   ├── Admin/
    │   │   └── UserManagement/    ← Quản lý tài khoản người dùng
    │   ├── Coordinator/
    │   │   ├── PurchaseOrder/     ← Tạo/duyệt/quản lý đơn đặt hàng
    │   │   ├── WarehouseReceipt/  ← Xem phiếu nhập kho (đơn đã nhận)
    │   │   └── Payment/           ← Ghi nhận thanh toán
    │   ├── StoreKeeper/
    │   │   ├── SupplierManagement/ ← CRUD nhà cung cấp
    │   │   └── SupplierContact/   ← Danh sách liên hệ nhà cung cấp
    │   └── WarehouseStaff/
    │       ├── ProductList/       ← Danh sách + quản lý sản phẩm
    │       └── CreateProduct/     ← Form tạo sản phẩm mới
    │
    ├── components/                ← UI Components dùng chung toàn app
    │   ├── Button/                ← Nút bấm (primary, secondary, danger...)
    │   ├── Card/                  ← Thẻ thông tin
    │   ├── ConfirmDialog/         ← Hộp thoại xác nhận hành động
    │   ├── Drawer/                ← Panel trượt từ bên phải
    │   ├── Input/                 ← Input text (đang active)
    │   ├── Modal/                 ← Hộp thoại modal
    │   ├── Pagination/            ← Phân trang
    │   ├── SearchBox/             ← Thanh tìm kiếm
    │   ├── Select/                ← Dropdown chọn giá trị
    │   ├── Table/                 ← Bảng dữ liệu
    │   └── Toast/                 ← Thông báo (success, error, info)
    │
    ├── layouts/
    │   └── DashboardLayout/       ← Layout chính: Sidebar + Header + Outlet
    │
    ├── services/                  ← Tầng giao tiếp với Backend API
    │   ├── api.ts                 ← apiFetch wrapper (token attach, auto refresh)
    │   ├── auth.ts                ← login, logout, getCurrentUser, getUserAuthorities
    │   ├── product.ts             ← getProductsPage, createProduct, updateProduct, deleteProduct
    │   ├── supplier.ts            ← getSuppliers, createSupplier, updateSupplier, deleteSupplier
    │   ├── purchaseOrder.ts       ← getPurchaseOrders, createPurchaseOrder, updateStatus
    │   └── payment.ts             ← createPayment, getPaymentHistory
    │
    ├── context/
    │   └── WarehouseContext.tsx   ← Global state: purchaseOrders + warehouseReceipts (in-memory)
    │
    ├── hooks/                     ← Custom React Hooks
    │   ├── useDebounce.ts         ← Trì hoãn xử lý input (search debounce)
    │   ├── usePagination.ts       ← Quản lý state phân trang
    │   ├── useSearch.ts           ← Kết hợp debounce + state tìm kiếm
    │   ├── useUnsavedChanges.ts   ← Cảnh báo khi rời trang có thay đổi chưa lưu
    │   └── useWarehouseContext.ts ← Helper hook để truy cập WarehouseContext
    │
    ├── types/                     ← TypeScript interface definitions
    │   ├── common.types.ts        ← ApiResponse<T>, PaymentMethod, shared types
    │   ├── product.types.ts       ← Product, Variant, ProductCategory, ProductFormData
    │   ├── supplier.types.ts      ← Supplier interface
    │   ├── purchaseOrder.types.ts ← PurchaseOrder, PurchaseOrderDetail, PurchaseOrderStatus
    │   └── payment.types.ts       ← WarehouseReceipt, ReceiptItem (dùng cho Context)
    │
    ├── constants/
    │   ├── routes.ts              ← Định nghĩa tất cả URL paths (ROUTES object)
    │   ├── navigation.ts          ← Cấu hình sidebar nav phân theo Role (NAV_GROUPS)
    │   └── product.ts             ← Hằng số liên quan product (category labels...)
    │
    └── utils/
        ├── formatters.ts          ← Format tiền tệ (VND), số lượng, ngày giờ
        └── validators.ts          ← Validate form (required, email, phone, price...)
```

---

## Hệ thống phân quyền (Role-based)

Sidebar điều hướng được lọc dựa trên `authorities` decode từ JWT:

| Role             | Trang có quyền truy cập                                  |
|------------------|----------------------------------------------------------|
| `admin`          | Dashboard, Quản lý tài khoản (`/admin/users`)           |
| `coordinator`    | Đơn đặt hàng, Phiếu nhập kho, Thanh toán               |
| `warehouse-staff`| Danh sách sản phẩm, Tạo sản phẩm mới                   |
| `store-keeper`   | Quản lý nhà cung cấp, Liên hệ đặt hàng                 |

---

# 🔄 LUỒNG DỮ LIỆU

## 1. Luồng Xác thực (Authentication Flow)

```
[Trang Login]
    │  Nhập username + password
    │  POST /api/v1/auth/login
    ▼
[Backend: AuthController → AuthService]
    │  Kiểm tra username/password (BCrypt)
    │  Tạo accessToken (JWT, HS256, ngắn hạn)
    │  Tạo refreshToken (JWT, dài hạn) → lưu vào Redis
    │  Set refreshToken vào HttpOnly Cookie (tên: refresh_token)
    │  Trả về accessToken + thông tin user trong body
    ▼
[Frontend: services/auth.ts]
    │  Lưu accessToken → localStorage["accessToken"]
    │  Lưu user info  → localStorage["currentUser"]
    ▼
[DashboardLayout]
    │  Đọc accessToken → decode JWT → lấy mảng authorities
    │  Lọc NAV_GROUPS theo role → hiển thị sidebar phù hợp
    ▼
[App hoạt động bình thường]
```

## 2. Luồng Gọi API (Request/Response Flow)

```
[Component]
    │  Gọi function từ services/ (vd: getProductsPage())
    ▼
[services/product.ts, services/purchaseOrder.ts, ...]
    │  Gọi apiFetch("/products", { method: "GET", ... })
    ▼
[services/api.ts — apiFetch()]
    │  Đọc accessToken từ localStorage
    │  Gắn header: Authorization: Bearer <accessToken>
    │  Gắn credentials: "include" (gửi kèm Cookie)
    │  Gọi fetch(url, options)
    ▼
[Backend: Spring Security Filter]
    │  Kiểm tra JWT signature (HS256, secret key)
    │  Giải mã → lấy subject (username), authorities (roles)
    │  Kiểm tra @PreAuthorize annotation trên Controller method
    ▼
[Controller → Service → Repository → MySQL]
    │  Xử lý logic, truy vấn DB
    │  Mapper Entity → ResponseDTO
    │  Trả về JSON response
    ▼
[apiFetch()] nhận response
    │  Nếu OK → parse JSON → trả về data cho component
    │
    │  Nếu 401 (token hết hạn):
    │    ├── isRefreshing = false → Gọi POST /auth/refresh-token (với Cookie)
    │    │     Backend xác thực refreshToken từ Redis
    │    │     Trả về accessToken mới
    │    │     → Lưu accessToken mới vào localStorage
    │    │     → Retry request gốc với token mới
    │    │
    │    └── isRefreshing = true → Queue request vào subscribers
    │          → Khi token mới có, retry tất cả requests đang chờ
    │
    │  Nếu refresh thất bại (refresh token hết hạn/không hợp lệ):
    │    → Xóa localStorage (accessToken, currentUser)
    │    → Redirect /login
```

## 3. Luồng Nghiệp vụ — Quản lý Nhập Kho

```
[store-keeper] — Quản lý Nhà cung cấp
    │  POST /api/v1/suppliers         → Tạo nhà cung cấp
    │  PUT  /api/v1/suppliers/{code}  → Cập nhật
    │  DELETE /api/v1/suppliers/{code}→ Vô hiệu hóa
    ▼
[coordinator] — Tạo Đơn Đặt Hàng
    │  POST /api/v1/purchase-orders
    │  Body: { supplierId, orderDate, note, details: [{ variantId, quantity, unitPrice }] }
    │  → Tạo PurchaseOrder với status = DRAFT
    │  → Tạo các PurchaseOrderDetail tương ứng
    ▼
[coordinator] — Duyệt Đơn
    │  PATCH /api/v1/purchase-orders/{id}/status
    │  Body: { status: "PENDING" }
    │  → PurchaseOrder.status = PENDING (Chờ nhận hàng)
    ▼
[coordinator] — Xác nhận Nhận Hàng
    │  PATCH /api/v1/purchase-orders/{id}/status
    │  Body: { status: "RECEIVED" }
    │  → PurchaseOrder.status = RECEIVED
    │  → PurchaseOrderService cập nhật ProductVariant.quantityOnHand (tồn kho tăng)
    │  → Ghi InventoryTransaction (loại: IMPORT)
    ▼
[coordinator] — Thanh toán
    │  POST /api/v1/payments
    │  Body: { purchaseOrderId, amount, paymentMethodId }
    │  → Tạo Payment record
    │  → Cập nhật PurchaseOrder.paymentStatus (UNPAID → PARTIAL → PAID)
    ▼
[Phiếu nhập kho]
    │  GET /api/v1/purchase-orders/received
    │  → Trả về danh sách PurchaseOrder có status = RECEIVED
```

## 4. Luồng Nghiệp vụ — Quản lý Sản phẩm

```
[warehouse-staff] — Tạo Sản phẩm
    │  GET /api/v1/categories  → Lấy danh mục để chọn
    │  POST /api/v1/products
    │  Body: {
    │    name, categoryId, brand, unit, description,
    │    option1Name (vd: "Màu sắc"), option2Name (vd: "Kích thước"),
    │    variants: [{ option1Value, option2Value, purchasePrice, salePrice }]
    │  }
    │  → Product + các ProductVariant được tạo đồng thời
    │  → SKU tự động sinh cho mỗi variant
    ▼
[warehouse-staff] — Cập nhật
    │  PUT /api/v1/products/{id}                    → Sửa thông tin sản phẩm + variants
    │  PUT /api/v1/products/variants/{id}           → Sửa 1 variant cụ thể
    │  PUT /api/v1/products/variants/bulk-update-price → Sửa giá hàng loạt
    ▼
[warehouse-staff] — Xóa
    │  DELETE /api/v1/products/{id}         → Xóa sản phẩm (soft/hard delete)
    │  DELETE /api/v1/products/variants     → Xóa nhiều variants (body: { variantIds })
```

## 5. State Management (Frontend)

```
<WarehouseContextProvider>            ← Bọc toàn bộ app
    │
    ├── purchaseOrders: PurchaseOrder[]     ← In-memory state
    ├── warehouseReceipts: WarehouseReceipt[] ← In-memory state
    │
    ├── addPurchaseOrder()            ← Thêm đơn mới (tạo id, code tạm)
    ├── updatePurchaseOrderStatus()   ← Cập nhật status đơn
    ├── editPurchaseOrder()           ← Sửa thông tin đơn
    ├── importOrder()                 ← Chuyển đơn APPROVED → WarehouseReceipt
    ├── addWarehouseReceipt()         ← Thêm phiếu nhập kho
    └── updatePayment()               ← Cập nhật thanh toán phiếu

⚠️ Lưu ý: WarehouseContext hiện là in-memory state (không gọi backend).
   Dữ liệu Product, Supplier, User, PurchaseOrder THẬT đã có services/*.ts gọi API.
```

---

# ⚙️ Cấu hình Môi trường

## Backend — `application.properties`

Tất cả giá trị nhạy cảm được đọc từ **environment variables**:

```properties
# MySQL
spring.datasource.url=${MYSQL_URL}
spring.datasource.username=${MYSQL_USERNAME}
spring.datasource.password=${MYSQL_PASSWORD}

# JWT
jwt.secret-key=${SECRET_KEY}
jwt.access-token-validity-in-seconds=${ACCESS_TOKEN_VALIDITY_IN_SECONDS}
jwt.refresh-token-validity-in-seconds=${REFRESH_TOKEN_VALIDITY_IN_SECONDS}
jwt.secret-key-verify-website=${SECRET_KEY_VERIFY_WEBSITE}

# Redis
spring.data.redis.host=${REDIS_HOST}
spring.data.redis.port=${REDIS_PORT}
spring.data.redis.ssl.enabled=false
```

## Frontend — `.env`

```env
VITE_API_URL=http://localhost:8080/api/v1
```

> Mặc định nếu không có `.env` sẽ dùng `http://localhost:8080/api/v1`

---

# 🚀 Khởi động Dự án

## Backend

```bash
cd backend
# Đảm bảo MySQL và Redis đang chạy
# Thiết lập environment variables trước

./mvnw spring-boot:run
# hoặc
mvn spring-boot:run

# API chạy tại: http://localhost:8080
```

## Frontend

```bash
cd frontend
npm install
npm run dev

# App chạy tại: http://localhost:5173
```

---

# ⚠️ Lưu ý Kỹ thuật

| # | Vấn đề | Chi tiết |
|---|--------|----------|
| 1 | **WarehouseContext là in-memory** | Dữ liệu PurchaseOrder và WarehouseReceipt trong Context không sync với backend. Có thể là phần đang phát triển. |
| 2 | **Spring Boot 3.5-SNAPSHOT** | Đang dùng bản snapshot chưa release, nên cân nhắc chuyển sang bản stable. |
| 3 | **Route thiếu** | `COORDINATOR_SUPPLIER` được khai báo trong `routes.ts` nhưng chưa có trong `App.tsx` router. |
| 4 | **JWT decode ở client** | Frontend decode JWT để lấy authorities bằng `atob()` — chỉ dùng để hiển thị UI, không thay thế kiểm tra server-side. |
| 5 | **Auto-refresh dùng Subscriber pattern** | Nếu nhiều request cùng lúc bị 401, chỉ 1 request gọi refresh-token, các request còn lại queue và retry sau khi có token mới. |
| 6 | **MapStruct + Lombok** | Cần cấu hình `annotationProcessorPaths` trong `pom.xml` để hai thư viện hoạt động cùng nhau (đã có trong dự án). |

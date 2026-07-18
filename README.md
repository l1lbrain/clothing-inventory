# 📦 Clothing Inventory Management System

Hệ thống quản lý kho hàng thời trang, gồm REST API Spring Boot và ứng dụng web React.

| Module | Vai trò | Công nghệ chính |
|---|---|---|
| `backend/` | REST API, xác thực, nghiệp vụ và lưu trữ dữ liệu | Java 17, Spring Boot 3.5.15, MySQL, Redis |
| `frontend/` | Single-page application cho các vai trò vận hành | React 19, TypeScript, Vite 8 |

## Yêu cầu cài đặt

- Java 17
- MySQL
- Redis
- Node.js và npm

## Cấu trúc dự án

```text
clothing-inventory/
├── backend/          Spring Boot API, Maven Wrapper và cấu hình server
├── frontend/         React/Vite application và package-lock.json
├── README.md         Hướng dẫn thiết lập và API map
└── TESTCASES.md      Các kịch bản kiểm thử thủ công
```

## Backend

### Stack

- Spring Boot 3.5.15 và Java 17
- Spring Web, Spring Data JPA và MySQL Connector/J
- Spring Security, OAuth2 Resource Server và Auth0 Java JWT
- Spring Data Redis cho refresh-token/cache behavior
- Jakarta Bean Validation, Lombok và MapStruct
- JUnit 5, Spring Boot Test và Spring Security Test

### Tổ chức mã nguồn

Mã nguồn backend nằm trong `backend/src/main/java/com/example/backend`:

- `controller`: HTTP endpoints.
- `service`: nghiệp vụ, orchestration và transaction boundaries.
- `repository` và `model`: truy cập dữ liệu JPA và entities.
- `dto`, `mapper`: request/response types và MapStruct mapping.
- `config`, `security`, `exception`, `util`: cấu hình ứng dụng, xác thực và xử lý lỗi dùng chung.

API trả JSON theo response envelope chuẩn `FormatMessageResponseDto<T>`; client đọc payload nghiệp vụ từ trường `data`.

## Frontend

### Stack

- React 19, TypeScript và Vite 8
- React Router DOM v7 với `createBrowserRouter`
- Redux Toolkit, React Redux và RTK Query
- CSS Modules cho style cục bộ; `src/index.css` chứa reset và design tokens dùng chung
- Native `fetch` qua wrapper `apiFetch`

### Tổ chức mã nguồn

Mã nguồn frontend nằm trong `frontend/src`:

- `pages`, `components`, `layouts`: màn hình, UI dùng lại và layout.
- `features`, `services`, `store`: nghiệp vụ frontend, giao tiếp API, Redux/RTK Query.
- `constants`, `hooks`, `types`, `utils`: route/constants, reusable hooks, type và helper.

`main.tsx` khởi tạo Redux `Provider`. Các backend request đi qua `services/api.ts`; access token được đính kèm khi phù hợp, và request 401 được refresh/retry qua refresh-token cookie.

## Phân quyền và UI routes

Sidebar chỉ hiển thị nhóm điều hướng theo authority trong token. Backend vẫn là lớp thực thi quyền truy cập cho API.

| Authority | Route UI đang được gắn | Chức năng |
|---|---|---|
| `admin` | `/`, `/admin/users` | Dashboard và quản lý tài khoản |
| `coordinator` | `/coordinator/purchase-order`, `/coordinator/warehouse-receipt` | Đơn đặt hàng và phiếu nhập kho |
| `warehouse-staff` | `/warehouse/products`, `/warehouse/products/create` | Quản lý và tạo sản phẩm |
| `store-keeper` | `/storekeeper/suppliers`, `/storekeeper/contact` | Quản lý và liên hệ nhà cung cấp |
| Authenticated | `/profile` | Thông tin cá nhân |
| Public | `/login` | Đăng nhập |

## API map

Base URL mặc định: `http://localhost:8080/api/v1`.

`Public` không yêu cầu access token. `Authenticated` yêu cầu access token hợp lệ. Các authority còn lại yêu cầu đúng quyền được ghi trong bảng.

### Dashboard — `/dashboard`

| Method | Path | Access | Mô tả |
|---|---|---|---|
| GET | `/dashboard` | `admin` | Lấy dữ liệu dashboard |

### Auth — `/auth`

| Method | Path | Access | Mô tả |
|---|---|---|---|
| POST | `/auth/login` | Public | Đăng nhập, trả access token và đặt refresh-token cookie |
| POST | `/auth/refresh-token` | Public, refresh-token cookie | Cấp access token mới |
| POST | `/auth/register` | `admin` | Tạo tài khoản |
| POST | `/auth/logout` | Authenticated | Xóa refresh token hiện tại |
| GET | `/auth/me` | Authenticated | Lấy người dùng hiện tại |

### Users — `/users`

| Method | Path | Access | Mô tả |
|---|---|---|---|
| GET | `/users` | `admin` | Danh sách user, filter/sort/pagination |
| GET | `/users/{id}` | Authenticated | Lấy user theo numeric ID |
| PATCH | `/users/{uuid}` | `admin` | Cập nhật thông tin user |
| PUT | `/users/{uuid}/roles` | `admin` | Thay thế roles của user |

### Products and variants — `/products`

| Method | Path | Access | Mô tả |
|---|---|---|---|
| GET | `/products` | `warehouse-staff` | Danh sách sản phẩm, filter/sort/pagination |
| POST | `/products` | `warehouse-staff` | Tạo sản phẩm và variants |
| PUT | `/products/{id}` | `warehouse-staff` | Cập nhật sản phẩm và variants |
| DELETE | `/products/{id}` | `warehouse-staff` | Xóa mềm sản phẩm |
| GET | `/products/variants` | `coordinator` | Danh sách variants |
| GET | `/products/variants/low-stock` | `admin` | Danh sách variants tồn kho thấp |
| GET | `/products/variants/{id}` | `warehouse-staff` | Chi tiết variant |
| PUT | `/products/variants/{id}` | `warehouse-staff` | Cập nhật variant hoặc điều chỉnh tồn kho |
| PUT | `/products/variants/bulk-update-price` | `warehouse-staff` | Cập nhật hàng loạt giá/trạng thái variant |
| DELETE | `/products/variants` | `warehouse-staff` | Xóa mềm nhiều variants |

### Categories — `/categories`

| Method | Path | Access | Mô tả |
|---|---|---|---|
| GET | `/categories` | `warehouse-staff` | Danh sách danh mục |
| POST | `/categories` | `warehouse-staff` | Tạo danh mục |
| PUT | `/categories/{id}` | `warehouse-staff` | Cập nhật danh mục |
| DELETE | `/categories/{id}` | `warehouse-staff` | Xóa mềm danh mục |
| PUT | `/categories/restore` | `warehouse-staff` | Khôi phục danh mục |

### Suppliers — `/suppliers`

| Method | Path | Access | Mô tả |
|---|---|---|---|
| GET | `/suppliers` | Authenticated | Danh sách nhà cung cấp, filter/sort/pagination |
| GET | `/suppliers/all` | Authenticated | Danh sách rút gọn nhà cung cấp |
| GET | `/suppliers/{id}` | Authenticated | Chi tiết nhà cung cấp theo numeric ID |
| POST | `/suppliers` | `store-keeper` | Tạo nhà cung cấp |
| PUT | `/suppliers/{code}` | `store-keeper` | Cập nhật đầy đủ nhà cung cấp |
| PATCH | `/suppliers/{code}` | `store-keeper` | Cập nhật một phần nhà cung cấp |
| DELETE | `/suppliers/{code}` | `store-keeper` | Xóa mềm nhà cung cấp |

### Purchase orders — `/purchase-orders`

| Method | Path | Access | Mô tả |
|---|---|---|---|
| GET | `/purchase-orders` | `coordinator` | Danh sách đơn, filter/sort/pagination |
| GET | `/purchase-orders/received` | `coordinator` | Danh sách đơn đã nhận hàng |
| GET | `/purchase-orders/{id}` | `coordinator` | Chi tiết đơn |
| POST | `/purchase-orders` | `coordinator` | Tạo đơn đặt hàng |
| PUT | `/purchase-orders/{id}` | `coordinator` | Cập nhật đơn |
| PATCH | `/purchase-orders/{id}/status` | `coordinator` | Chuyển trạng thái đơn |

### Payments and payment methods

| Method | Path | Access | Mô tả |
|---|---|---|---|
| POST | `/payments` | Authenticated | Ghi nhận thanh toán |
| GET | `/payments/purchase-order/{purchaseOrderId}` | `coordinator` | Lịch sử thanh toán của đơn |
| GET | `/payment-methods` | `coordinator` | Danh sách phương thức thanh toán |

### Inventory transactions — `/inventory-transactions`

| Method | Path | Access | Mô tả |
|---|---|---|---|
| GET | `/inventory-transactions` | `coordinator` | Danh sách giao dịch tồn kho |
| GET | `/inventory-transactions/variant/{variantId}` | `warehouse-staff` | Lịch sử giao dịch của variant |

## Cấu hình môi trường

### Backend

Backend import file `.env` theo Java Properties từ cả thư mục làm việc hiện tại và `backend/.env`. Vì vậy có thể chạy lệnh từ repository root hoặc từ `backend/` mà vẫn dùng cấu hình local tương ứng.

Tạo `.env` trong root hoặc `backend/` với các placeholder an toàn sau:

```properties
# MySQL
MYSQL_URL=jdbc:mysql://localhost:3306/clothing_inventory
MYSQL_USERNAME=app_user
MYSQL_PASSWORD=change-me

# JWT
SECRET_KEY=replace-with-a-long-random-development-secret
ACCESS_TOKEN_VALIDITY_IN_SECONDS=900
REFRESH_TOKEN_VALIDITY_IN_SECONDS=604800

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

Không commit file `.env` hay dùng giá trị production trong tài liệu. Cấu hình JPA hiện dùng `spring.jpa.hibernate.ddl-auto=update`; chỉ dùng với dữ liệu và môi trường phù hợp.

### Frontend

Tạo `frontend/.env` khi cần thay đổi URL API hoặc upload ảnh:

```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset
```

Nếu không đặt `VITE_API_URL`, frontend dùng mặc định `http://localhost:8080/api/v1`. Upload ảnh sản phẩm cần hai biến Cloudinary. Mọi biến `VITE_` đều được nhúng vào client, nên không đặt secrets trong chúng.

## Chạy dự án local

Khởi động MySQL và Redis, cấu hình biến môi trường, sau đó chạy backend và frontend trong hai terminal riêng.

### Backend

Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

macOS/Linux:

```bash
cd backend
./mvnw spring-boot:run
```

API chạy tại `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Vite thường chạy tại `http://localhost:5173`. Backend CORS hiện cho phép các origin `http://localhost:5173` và `http://localhost:5174`.

## Kiểm tra

Backend, từ `backend/`:

```powershell
.\mvnw.cmd test
```

Frontend, từ `frontend/`:

```bash
npm run lint
npm run build
```

Xem `TESTCASES.md` để thực hiện các kịch bản kiểm thử thủ công theo luồng nghiệp vụ.

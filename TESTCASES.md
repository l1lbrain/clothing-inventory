# Smoke Checklist

Checklist này dành cho kiểm tra thủ công trước khi release hoặc sau thay đổi lớn. Đây không phải báo cáo kết quả đã chạy và không thay thế automated tests.

## Chuẩn bị

- MySQL, Redis, backend và frontend đang chạy.
- Có tài khoản `admin`, `coordinator`, `warehouse-staff` và `store-keeper`.
- Có ít nhất một category, payment method, supplier, product và product variant để thử các luồng liên quan.

## Kiểm tra tự động

Từ `backend/` trên Windows PowerShell:

```powershell
.\mvnw.cmd test
```

Từ `frontend/`:

```bash
npm run test
npm run lint
npm run build
```

## Luồng cần kiểm tra

- [ ] **Authentication:** Đăng nhập đúng/sai; user hợp lệ vào được ứng dụng; logout xóa session; access token hết hạn được refresh khi refresh-token còn hiệu lực.
- [ ] **Phân quyền:** Sidebar chỉ hiện nhóm phù hợp với role. Request API không có quyền phải bị từ chối và không hiển thị dữ liệu được bảo vệ.
- [ ] **Sản phẩm:** `warehouse-staff` tạo sản phẩm có variants, chỉnh sửa variant và kiểm tra danh sách sản phẩm/variant phản ánh thay đổi.
- [ ] **Nhà cung cấp:** `store-keeper` tạo, cập nhật và xóa mềm nhà cung cấp; danh sách không còn hiển thị bản ghi đã xóa.
- [ ] **Đơn đặt hàng:** `coordinator` tạo đơn, chuyển `DRAFT → PENDING → RECEIVED`; khi nhận hàng, tồn kho variant tăng và có lịch sử giao dịch tồn kho.
- [ ] **Thanh toán:** Tạo thanh toán hợp lệ cho đơn; kiểm tra lịch sử thanh toán và payment status được cập nhật đúng.
- [ ] **Quản lý tài khoản:** `admin` xem danh sách user, cập nhật thông tin/role và vô hiệu hóa user; user bị vô hiệu hóa không thể đăng nhập lại.
- [ ] **UI và lỗi:** Form bắt buộc hiển thị validation trước khi gửi request; thành công/lỗi API có thông báo rõ ràng; kiểm tra thao tác thay đổi ở viewport desktop và mobile khi giao diện bị ảnh hưởng.

## Khi checklist thất bại

Ghi lại luồng tái hiện, role đang dùng, dữ liệu đầu vào, request/response liên quan và ảnh chụp màn hình nếu lỗi thuộc UI. Thêm automated regression test khi lỗi có thể được kiểm thử ổn định.

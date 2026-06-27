import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { WarehouseReceiptPage } from "./pages/Coordinator/WarehouseReceipt/WarehouseReceipt";
import { Payment } from "./pages/Coordinator/Payment/Payment";
import { ProductList } from "./pages/WarehouseStaff/ProductList/ProductList";
import { CreateProduct } from "./pages/WarehouseStaff/CreateProduct/CreateProduct";
import { SupplierManagement } from "./pages/StoreKeeper/SupplierManagement/SupplierManagement";
import { SupplierContact } from "./pages/StoreKeeper/SupplierContact/SupplierContact";
import { Login } from "./pages/Login/Login";
import { Profile } from "./pages/Profile/Profile";
import { ROUTES } from "./constants/routes";
import { ToastProvider } from "./components/Toast/ToastProvider";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path={ROUTES.LOGIN} element={<Login />} />

          {/* Protected – có sidebar & header */}
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />

            {/* Điều phối viên */}
            <Route
              path={ROUTES.COORDINATOR_RECEIPT}
              element={<WarehouseReceiptPage />}
            />
            <Route path={ROUTES.COORDINATOR_PAYMENT} element={<Payment />} />

            {/* Nhân viên kho */}
            <Route path={ROUTES.WAREHOUSE_PRODUCTS} element={<ProductList />} />
            <Route
              path={ROUTES.WAREHOUSE_CREATE_PRODUCT}
              element={<CreateProduct />}
            />

            {/* Thủ kho */}
            <Route
              path={ROUTES.STOREKEEPER_SUPPLIERS}
              element={<SupplierManagement />}
            />
            <Route
              path={ROUTES.STOREKEEPER_CONTACT}
              element={<SupplierContact />}
            />

            {/* Thông tin cá nhân */}
            <Route path={ROUTES.PROFILE} element={<Profile />} />

            <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

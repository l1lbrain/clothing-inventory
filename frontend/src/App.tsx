import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout/DashboardLayout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { SupplierList } from './pages/Coordinator/Supplier/SupplierList';
import { WarehouseReceiptPage } from './pages/Coordinator/WarehouseReceipt/WarehouseReceipt';
import { Payment } from './pages/Coordinator/Payment/Payment';
import { ProductList } from './pages/WarehouseStaff/ProductList/ProductList';
import { CreateProduct } from './pages/WarehouseStaff/CreateProduct/CreateProduct';
import { UpdateProduct } from './pages/WarehouseStaff/UpdateProduct/UpdateProduct';
import { SupplierManagement } from './pages/StoreKeeper/SupplierManagement/SupplierManagement';
import { SupplierContact } from './pages/StoreKeeper/SupplierContact/SupplierContact';
import { SupplierUpdate } from './pages/StoreKeeper/SupplierUpdate/SupplierUpdate';
import { ROUTES } from './constants/routes';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />

          {/* Điều phối viên */}
          <Route path={ROUTES.COORDINATOR_SUPPLIER} element={<SupplierList />} />
          <Route path={ROUTES.COORDINATOR_RECEIPT} element={<WarehouseReceiptPage />} />
          <Route path={ROUTES.COORDINATOR_PAYMENT} element={<Payment />} />

          {/* Nhân viên kho */}
          <Route path={ROUTES.WAREHOUSE_PRODUCTS} element={<ProductList />} />
          <Route path={ROUTES.WAREHOUSE_CREATE_PRODUCT} element={<CreateProduct />} />
          <Route path={ROUTES.WAREHOUSE_UPDATE_PRODUCT} element={<UpdateProduct />} />

          {/* Thủ kho */}
          <Route path={ROUTES.STOREKEEPER_SUPPLIERS} element={<SupplierManagement />} />
          <Route path={ROUTES.STOREKEEPER_CONTACT} element={<SupplierContact />} />
          <Route path={ROUTES.STOREKEEPER_UPDATE_SUPPLIER} element={<SupplierUpdate />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

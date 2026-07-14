import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { WarehouseReceiptPage } from "./pages/Coordinator/WarehouseReceipt/WarehouseReceipt";
import { PurchaseOrderPage } from "./pages/Coordinator/PurchaseOrder/PurchaseOrder";
import { ProductList } from "./pages/WarehouseStaff/ProductList/ProductList";
import { CreateProduct } from "./pages/WarehouseStaff/CreateProduct/CreateProduct";
import { SupplierManagement } from "./pages/StoreKeeper/SupplierManagement/SupplierManagement";
import { SupplierContact } from "./pages/StoreKeeper/SupplierContact/SupplierContact";
import { Login } from "./pages/Login/Login";
import { Profile } from "./pages/Profile/Profile";
import { UserManagement } from "./pages/Admin/UserManagement/UserManagement";
import { ROUTES } from "./constants/routes";
import { ToastProvider } from "./components/Toast/ToastProvider";

const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <Login />,
  },
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: ROUTES.COORDINATOR_ORDER,
        element: <PurchaseOrderPage />,
      },
      {
        path: ROUTES.COORDINATOR_RECEIPT,
        element: <WarehouseReceiptPage />,
      },
      {
        path: ROUTES.WAREHOUSE_PRODUCTS,
        element: <ProductList />,
      },
      {
        path: ROUTES.WAREHOUSE_CREATE_PRODUCT,
        element: <CreateProduct />,
      },
      {
        path: ROUTES.STOREKEEPER_SUPPLIERS,
        element: <SupplierManagement />,
      },
      {
        path: ROUTES.STOREKEEPER_CONTACT,
        element: <SupplierContact />,
      },
      {
        path: ROUTES.PROFILE,
        element: <Profile />,
      },
      {
        path: ROUTES.ADMIN_USERS,
        element: <UserManagement />,
      },
      {
        path: "*",
        element: <Navigate to={ROUTES.LOGIN} replace />,
      },
    ],
  },
]);

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

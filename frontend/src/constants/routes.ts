export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/",

  COORDINATOR_ORDER: "/coordinator/purchase-order",
  COORDINATOR_RECEIPT: "/coordinator/warehouse-receipt",

  WAREHOUSE_PRODUCTS: "/warehouse/products",
  WAREHOUSE_CREATE_PRODUCT: "/warehouse/products/create",

  STOREKEEPER_SUPPLIERS: "/storekeeper/suppliers",
  STOREKEEPER_CONTACT: "/storekeeper/contact",
  PROFILE: "/profile",
  ADMIN_USERS: "/admin/users",
} as const;

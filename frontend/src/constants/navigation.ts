import { ROUTES } from "./routes";

export interface NavItem {
  label: string;
  path?: string;
  icon: string;
  children?: NavItem[];
}

export interface NavGroup {
  groupLabel: string;
  items: NavItem[];
  roles?: string[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: "NHÂN VIÊN ĐIỀU PHỐI",
    roles: ["coordinator"],
    items: [
      {
        label: "Phiếu nhập kho",
        path: ROUTES.COORDINATOR_RECEIPT,
        icon: "fi fi-rr-file-invoice",
      },
      {
        label: "Thanh toán nhà cung cấp",
        path: ROUTES.COORDINATOR_PAYMENT,
        icon: "fi fi-rr-credit-card",
      },
    ],
  },
  {
    groupLabel: "NHÂN VIÊN KHO",
    roles: ["warehouse-staff"],
    items: [
      {
        label: "Danh sách sản phẩm",
        path: ROUTES.WAREHOUSE_PRODUCTS,
        icon: "fi fi-rr-box-alt",
      },
      {
        label: "Tạo sản phẩm mới",
        path: ROUTES.WAREHOUSE_CREATE_PRODUCT,
        icon: "fi fi-rr-add",
      },
    ],
  },
  {
    groupLabel: "THỦ KHO",
    roles: ["store-keeper"],
    items: [
      {
        label: "Quản lý nhà cung cấp",
        path: ROUTES.STOREKEEPER_SUPPLIERS,
        icon: "fi fi-rr-users-alt",
      },
      {
        label: "Liên hệ đặt hàng",
        path: ROUTES.STOREKEEPER_CONTACT,
        icon: "fi fi-rr-phone-call",
      },
    ],
  },
];

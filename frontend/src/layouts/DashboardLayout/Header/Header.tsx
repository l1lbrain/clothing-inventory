import { useLocation } from "react-router-dom";
import styles from "./Header.module.css";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/coordinator/suppliers": "Nhà cung cấp",
  "/coordinator/warehouse-receipt": "Lập phiếu nhập kho",
  "/coordinator/payment": "Thanh toán nhà cung cấp",
  "/warehouse/products": "Danh sách sản phẩm",
  "/warehouse/products/create": "Tạo sản phẩm mới",
  "/storekeeper/suppliers": "Quản lý nhà cung cấp",
  "/storekeeper/contact": "Liên hệ đặt hàng",
  "/profile": "Thông tin cá nhân",
};

interface HeaderProps {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
}

export function Header({ onMenuClick, onToggleSidebar }: HeaderProps) {
  const location = useLocation();

  // Lấy tiêu đề trang
  const getTitle = () => {
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (
        location.pathname === path ||
        location.pathname.startsWith(path + "/")
      ) {
        return title;
      }
    }
    return "WareFlow";
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.menuBtn}
          onClick={onMenuClick}
          aria-label="Mở menu"
          id="mobile-menu-btn"
        >
          <i className="fi fi-rr-menu-burger" aria-hidden />
        </button>

        <button
          className={[styles.menuBtn, styles.desktopToggle].join(" ")}
          onClick={onToggleSidebar}
          aria-label="Thu gọn sidebar"
          id="sidebar-toggle-btn"
        >
          <i className="fi fi-rr-sidebar" aria-hidden />
        </button>

        <div className={styles.pageInfo}>
          <h1 className={styles.pageTitle}>{getTitle()}</h1>
        </div>
      </div>

      <div className={styles.right}></div>
    </header>
  );
}

import { useState, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar/Sidebar";
import { Header } from "./Header/Header";
import { Drawer } from "../../components/Drawer/Drawer";
import {
  isAuthenticated,
  getCurrentUser,
  fetchCurrentUser,
  logout,
  type User,
} from "../../services/auth";
import { ApiError } from "../../services/api";
import { ROUTES } from "../../constants/routes";
import styles from "./DashboardLayout.module.css";

export function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated()) {
      fetchCurrentUser()
        .then((updatedUser) => {
          setUser(updatedUser);
        })
        .catch((err) => {
          console.error("Lỗi tải thông tin user:", err);
          if (err instanceof ApiError && err.status === 401) {
            logout();
          }
        });
    }
  }, []);

  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return (
    <div className={styles.layout}>
      <div className={styles.desktopSidebar}>
        <Sidebar collapsed={sidebarCollapsed} user={user} />
      </div>

      {
        // Drawer cho mobile
      }
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar user={user} />
      </Drawer>

      <div className={styles.main}>
        <Header
          onMenuClick={() => setDrawerOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

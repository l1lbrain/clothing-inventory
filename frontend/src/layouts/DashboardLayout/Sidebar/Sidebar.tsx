import { NavLink, Link, useLocation } from "react-router-dom";
import { NAV_GROUPS } from "../../../constants/navigation";
import { ROUTES } from "../../../constants/routes";
import {
  getCurrentUser,
  getUserAuthorities,
  logout,
  type User,
} from "../../../services/auth";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  collapsed?: boolean;
  user?: User | null;
}

export function Sidebar({ collapsed = false, user: propUser }: SidebarProps) {
  const location = useLocation();
  const user = propUser !== undefined ? propUser : getCurrentUser();
  const avatarChar = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : "U";

  return (
    <nav
      className={[styles.sidebar, collapsed ? styles.collapsed : ""].join(" ")}
    >
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <i className="fi fi-rr-box-alt" aria-hidden />
        </div>
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoName}>WareFlow</span>
            <span className={styles.logoSub}>Quản lý nhập kho</span>
          </div>
        )}
      </div>



      <div className={styles.navGroups}>
        {NAV_GROUPS.filter(
          (group) =>
            !group.roles ||
            group.roles.some((role) => getUserAuthorities().includes(role))
        ).map((group) => (
          <div key={group.groupLabel} className={styles.navGroup}>
            {!collapsed && (
              <span className={styles.groupLabel}>{group.groupLabel}</span>
            )}
            {group.items.map((item) => {
              const hasMoreSpecificMatch = NAV_GROUPS.some((g) =>
                g.items.some(
                  (otherItem) =>
                    otherItem.path &&
                    otherItem.path !== item.path &&
                    otherItem.path.length > (item.path?.length ?? 0) &&
                    (location.pathname === otherItem.path ||
                      location.pathname.startsWith(otherItem.path + "/")),
                ),
              );

              const isActive = item.path
                ? (location.pathname === item.path ||
                    location.pathname.startsWith(item.path + "/")) &&
                  !hasMoreSpecificMatch
                : false;

              return (
                <NavLink
                  key={item.label}
                  to={item.path ?? "#"}
                  className={[
                    styles.navItem,
                    isActive ? styles.active : "",
                  ].join(" ")}
                  title={collapsed ? item.label : undefined}
                >
                  <i className={item.icon} aria-hidden />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.userCard}>
        {!collapsed ? (
          <>
            <Link to={ROUTES.PROFILE} className={styles.userProfileLink}>
              <div className={styles.avatar} aria-hidden>
                <span>{avatarChar}</span>
              </div>
              <div className={styles.userInfo} style={{ flex: 1, minWidth: 0 }}>
                <span className={styles.userName}>
                  {user?.fullName || "Người dùng"}
                </span>
                <span className={styles.userRole}>
                  {user?.email || "Hệ thống"}
                </span>
              </div>
            </Link>
            <button
              onClick={logout}
              className={styles.logoutBtn}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <i className="fi fi-rr-sign-out-alt" />
            </button>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
              width: "100%",
            }}
          >
            <Link
              to={ROUTES.PROFILE}
              className={styles.avatar}
              title="Trang cá nhân"
            >
              <span>{avatarChar}</span>
            </Link>
            <button
              onClick={logout}
              className={styles.logoutBtn}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <i className="fi fi-rr-sign-out-alt" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

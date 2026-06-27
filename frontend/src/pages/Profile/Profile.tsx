import { getCurrentUser } from "../../services/auth";
import { formatDate } from "../../utils/formatters";
import styles from "./Profile.module.css";

interface DecodedToken {
  sub?: string;
  exp?: number;
  type?: string;
  iat?: number;
  authorities?: string[];
}

function decodeJwtPayload(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload) as DecodedToken;
  } catch {
    return null;
  }
}

const ROLE_MAP: Record<string, { label: string; icon: string }> = {
  coordinator: { label: "Nhân viên điều phối", icon: "fi fi-rr-building" },
  "warehouse-staff": { label: "Nhân viên kho", icon: "fi fi-rr-box-alt" },
  storekeeper: { label: "Thủ kho", icon: "fi fi-rr-users-alt" },
};

export function Profile() {
  const user = getCurrentUser();
  const token = localStorage.getItem("accessToken");
  const decoded = token ? decodeJwtPayload(token) : null;
  const authorities = decoded?.authorities || [];

  const avatarChar = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : "U";

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            <span>{avatarChar}</span>
          </div>
          <div className={styles.titleInfo}>
            <h2>{user?.fullName || "Chưa cập nhật"}</h2>
            <span className={styles.subtitle}>
              Tài khoản thành viên hệ thống
            </span>
          </div>
        </div>

        <div className={styles.body}>
          <h3 className={styles.sectionTitle}>
            <i className="fi fi-rr-user" />
            <span>Thông tin cá nhân</span>
          </h3>

          <div className={styles.grid}>
            <div className={styles.field}>
              <span className={styles.label}>Họ và tên</span>
              <div className={styles.valueWrapper}>
                <i className="fi fi-rr-id-badge" />
                <span className={styles.value}>{user?.fullName || "—"}</span>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Email</span>
              <div className={styles.valueWrapper}>
                <i className="fi fi-rr-envelope" />
                <span className={styles.value}>{user?.email || "—"}</span>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Số điện thoại</span>
              <div className={styles.valueWrapper}>
                <i className="fi fi-rr-phone-call" />
                <span className={styles.value}>
                  {user?.phone || "Chưa cập nhật"}
                </span>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Ngày tham gia</span>
              <div className={styles.valueWrapper}>
                <i className="fi fi-rr-calendar" />
                <span className={styles.value}>
                  {user?.createdAt ? formatDate(user.createdAt) : "—"}
                </span>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Mã định danh (UUID)</span>
              <div className={styles.valueWrapper}>
                <i className="fi fi-rr-key" />
                <span
                  className={styles.value}
                  style={{ fontSize: "11px", fontFamily: "monospace" }}
                >
                  {user?.uuid || "—"}
                </span>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Vai trò trên hệ thống</span>
              <div className={styles.roleTags}>
                {authorities.length > 0 ? (
                  authorities.map((role) => {
                    const mapped = ROLE_MAP[role] || {
                      label: role,
                      icon: "fi fi-rr-shield",
                    };
                    return (
                      <span key={role} className={styles.roleTag}>
                        <i className={mapped.icon} />
                        <span>{mapped.label}</span>
                      </span>
                    );
                  })
                ) : (
                  <span
                    className={styles.roleTag}
                    style={{
                      backgroundColor: "var(--color-hover)",
                      color: "var(--color-subtext)",
                    }}
                  >
                    <i className="fi fi-rr-shield" />
                    <span>Không có vai trò</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

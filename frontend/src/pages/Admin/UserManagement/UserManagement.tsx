import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { getUserAuthorities, registerUser, getUsersPage, updateUser, updateUserRoles, type UserResponse } from "../../../services/auth";
import { useToast } from "../../../components/Toast/ToastContext";
import { Button } from "../../../components/Button/Button";
import { Table } from "../../../components/Table/Table";
import { SearchBox } from "../../../components/SearchBox/SearchBox";
import { Input } from "../../../components/Input/Input";
import { Select } from "../../../components/Select/Select";
import { Modal } from "../../../components/Modal/Modal";
import { Pagination } from "../../../components/Pagination/Pagination";
import { ConfirmDialog } from "../../../components/ConfirmDialog/ConfirmDialog";
import styles from "./UserManagement.module.css";
import type { TableColumn } from "../../../types/common.types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  coordinator: "Nhân viên điều phối",
  "warehouse-staff": "Nhân viên kho",
  "store-keeper": "Thủ kho",
};

const ASSIGNABLE_ROLES: Record<string, string> = {
  coordinator: "Nhân viên điều phối",
  "warehouse-staff": "Nhân viên kho",
  "store-keeper": "Thủ kho",
};

const translateUserError = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes("account already exists")) {
    return "Tên đăng nhập đã tồn tại trong hệ thống!";
  }
  if (msg.includes("email already in use")) {
    return "Email này đã được sử dụng bởi tài khoản khác!";
  }
  if (msg.includes("phone number already in use")) {
    return "Số điện thoại này đã được sử dụng bởi tài khoản khác!";
  }
  if (msg.includes("unauthorized") || msg.includes("forbidden")) {
    return "Bạn không có quyền thực hiện hành động này!";
  }
  if (msg.includes("role not found")) {
    return "Không tìm thấy vai trò đã chọn!";
  }
  if (msg.includes("account not found")) {
    return "Không tìm thấy tài khoản!";
  }
  return message;
};

export function UserManagement() {
  const authorities = getUserAuthorities();
  const isAdmin = authorities.includes("admin");

  const { showToast } = useToast();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalElements, setUsersTotalElements] = useState(0);
  const [usersPageSize, setUsersPageSize] = useState(10);
  const [usersSortBy, setUsersSortBy] = useState<"username" | "fullName" | "email" | "status" | "createdAt">("createdAt");
  const [usersSortDir, setUsersSortDir] = useState<"asc" | "desc">("desc");
  const [usersRefreshTrigger, setUsersRefreshTrigger] = useState(0);

  const [searchAccount, setSearchAccount] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
    authorities: [] as string[],
  });

  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "DELETED",
    authorities: [] as string[],
  });

  // Debounce tìm kiếm tài khoản
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchAccount);
      setUsersPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchAccount]);

  // Load users page từ backend
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const data = await getUsersPage(
          usersPage,
          debouncedSearch || undefined,
          userStatusFilter || undefined,
          usersSortBy,
          usersSortDir
        );
        setUsers(data.items);
        setUsersTotalElements(data.totalElements);
        setUsersPageSize(data.pageSize);
      } catch (err) {
        console.error("Failed to load users:", err);
        showToast("Không thể tải danh sách tài khoản từ máy chủ!", "error");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isAdmin, usersPage, debouncedSearch, userStatusFilter, usersSortBy, usersSortDir, usersRefreshTrigger, showToast]);

  const triggerUsersRefresh = () => setUsersRefreshTrigger((prev) => prev + 1);

  const handleUsersSort = (field: "username" | "fullName" | "email" | "status" | "createdAt") => {
    if (usersSortBy === field) {
      setUsersSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setUsersSortBy(field);
      setUsersSortDir("asc");
    }
    setUsersPage(1);
  };

  const buildUsersSortHeader = (label: string, field: "username" | "fullName" | "email" | "status" | "createdAt") => {
    const isCurrent = usersSortBy === field;
    const isAsc = isCurrent && usersSortDir === "asc";
    const iconClass = isAsc ? "fi fi-rr-caret-up" : "fi fi-rr-caret-down";

    return (
      <span
        className={styles.sortableHeader}
        onClick={() => handleUsersSort(field)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleUsersSort(field)}
      >
        {label}
        <i
          className={`${iconClass} ${isAsc ? styles.sortIconActive : styles.sortIcon}`}
        />
      </span>
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.fullName || !createForm.password) {
      showToast("Vui lòng điền đầy đủ các trường bắt buộc!", "warning");
      return;
    }
    if (createForm.password.length <= 6) {
      showToast("Mật khẩu phải lớn hơn 6 ký tự!", "warning");
      return;
    }
    if (createForm.authorities.length === 0) {
      showToast("Vui lòng chọn ít nhất một vai trò!", "warning");
      return;
    }

    try {
      await registerUser({
        username: createForm.username.trim(),
        password: createForm.password,
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim(),
        roles: createForm.authorities,
      });

      setIsCreateOpen(false);
      setCreateForm({ username: "", password: "", fullName: "", email: "", phone: "", authorities: [] });
      showToast("Tạo tài khoản thành công!", "success");
      triggerUsersRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tạo tài khoản thất bại!";
      showToast(translateUserError(msg), "error");
    }
  };

  const handleEditClick = (u: UserResponse) => {
    setSelectedUser(u);
    setEditForm({
      fullName: u.fullName,
      email: u.email || "",
      phone: u.phone || "",
      status: u.status,
      authorities: u.roles,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editForm.fullName) {
      showToast("Vui lòng điền đầy đủ các trường bắt buộc!", "warning");
      return;
    }
    if (selectedUser.roles.includes("admin") && editForm.status === "INACTIVE") {
      showToast("Không thể khóa tài khoản Admin!", "error");
      return;
    }
    if (editForm.authorities.length === 0) {
      showToast("Vui lòng chọn ít nhất một vai trò!", "warning");
      return;
    }

    try {
      await updateUser(selectedUser.uuid, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        status: editForm.status,
      });
      await updateUserRoles(selectedUser.uuid, editForm.authorities);
      setIsEditOpen(false);
      setSelectedUser(null);
      showToast("Cập nhật tài khoản thành công!", "success");
      triggerUsersRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cập nhật tài khoản thất bại!";
      showToast(translateUserError(msg), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = users.find((u) => u.uuid === deleteId);
    if (!target) return;
    if (target.roles.includes("admin")) {
      showToast("Không thể xóa tài khoản Admin!", "error");
      setDeleteId(null);
      return;
    }

    try {
      await updateUser(deleteId, {
        status: "DELETED"
      });
      showToast("Đã xóa tài khoản!", "success");
      setDeleteId(null);
      triggerUsersRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xóa tài khoản thất bại!";
      showToast(translateUserError(msg), "error");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => u.status !== "DELETED");
  }, [users]);

  const toggleCreateRole = (role: string) => {
    setCreateForm((prev) => {
      const has = prev.authorities.includes(role);
      const next = has
        ? prev.authorities.filter((r) => r !== role)
        : [...prev.authorities, role];
      return { ...prev, authorities: next };
    });
  };

  const toggleEditRole = (role: string) => {
    setEditForm((prev) => {
      const has = prev.authorities.includes(role);
      const next = has
        ? prev.authorities.filter((r) => r !== role)
        : [...prev.authorities, role];
      return { ...prev, authorities: next };
    });
  };

  const deleteTarget = users.find((u) => u.uuid === deleteId);

  const columns: TableColumn<UserResponse>[] = [
    { key: "username", label: buildUsersSortHeader("Tên đăng nhập", "username"), width: "150px" },
    { key: "fullName", label: buildUsersSortHeader("Họ và tên", "fullName") },
    { key: "email", label: buildUsersSortHeader("Email", "email") },
    { key: "phone", label: "Số điện thoại", width: "135px", render: (val) => (val as string) || "—" },
    {
      key: "roles",
      label: "Quyền hạn",
      render: (val) => (
        <div className={styles.roleBadges}>
          {(val as string[]).map((auth) => (
            <span key={auth} className={[styles.roleBadge, styles[auth] || ""].join(" ")}>
              {ROLE_LABELS[auth] || auth}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      label: "Trạng thái",
      width: "140px",
      align: "center",
      render: (val) => {
        const isActive = val === "ACTIVE";
        return (
          <span className={[styles.badge, isActive ? styles.active : styles.inactive].join(" ")}>
            {isActive ? "Hoạt động" : "Ngừng hoạt động"}
          </span>
        );
      },
    },
    {
      key: "uuid",
      label: "Hành động",
      width: "160px",
      align: "center",
      render: (_, row) => (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            icon="fi fi-rr-edit"
            onClick={() => handleEditClick(row)}
          >
            Sửa
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon="fi fi-rr-trash"
            onClick={() => setDeleteId(row.uuid)}
            disabled={row.roles.includes("admin")}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Quản lý tài khoản</h2>
            <p className={styles.subtitle}>Danh sách và phân quyền tài khoản nhân viên hệ thống</p>
          </div>
          <Button icon="fi fi-rr-add" onClick={() => setIsCreateOpen(true)} id="add-user-btn">
            Tạo tài khoản
          </Button>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", maxWidth: "240px" }}>
          <Select
            id="userStatusFilter"
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "ACTIVE", label: "Hoạt động" },
              { value: "INACTIVE", label: "Ngừng hoạt động" },
            ]}
            value={userStatusFilter}
            onChange={(e) => {
              setUserStatusFilter(e.target.value as "" | "ACTIVE" | "INACTIVE");
              setUsersPage(1);
            }}
          />
        </div>

        <Card>
          <CardHeader
            title="Tài khoản hệ thống"
            actions={
              <SearchBox
                placeholder="Tìm tên, tài khoản..."
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
                onClear={() => setSearchAccount("")}
              />
            }
          />
          <CardBody className={styles.tableBody}>
            <Table
              columns={columns}
              data={filteredUsers}
              rowKey="uuid"
              loading={loadingUsers}
              emptyText="Không tìm thấy tài khoản nào"
            />
            {usersTotalElements > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px", borderTop: "1px solid var(--color-border)" }}>
                <Pagination
                  pagination={{ page: usersPage, pageSize: usersPageSize, total: usersTotalElements }}
                  onPageChange={setUsersPage}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modal Tạo tài khoản mới */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Tạo tài khoản mới"
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formRow}>
            <Input
              id="create-username"
              label="Tên đăng nhập"
              required
              value={createForm.username}
              onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              placeholder="Nhập tên đăng nhập"
            />
            <Input
              id="create-fullName"
              label="Họ và tên"
              required
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              placeholder="Nhập họ và tên"
            />
          </div>
          <div className={styles.formRow}>
            <Input
              id="create-email"
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="example@sapoware.com"
            />
            <Input
              id="create-phone"
              label="Số điện thoại"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              placeholder="Nhập số điện thoại"
            />
          </div>
          <div className={styles.formRow}>
            <Input
              id="create-password"
              label="Mật khẩu"
              required
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="Nhập mật khẩu"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Quyền hạn (Vai trò)</label>
            <div className={styles.checkboxGrid}>
              {Object.keys(ASSIGNABLE_ROLES).map((role) => (
                <label key={role} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={createForm.authorities.includes(role)}
                    onChange={() => toggleCreateRole(role)}
                    className={styles.checkboxInput}
                  />
                  {ASSIGNABLE_ROLES[role]}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} icon="fi fi-rr-check">
              Tạo tài khoản
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Chỉnh sửa tài khoản */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Chỉnh sửa tài khoản: ${selectedUser?.username ?? ""}`}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formRow}>
            <Input
              id="edit-fullName"
              label="Họ và tên"
              required
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              placeholder="Nhập họ và tên"
            />
            <Input
              id="edit-email"
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="example@sapoware.com"
            />
          </div>
          <div className={styles.formRow}>
            <Input
              id="edit-phone"
              label="Số điện thoại"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="Nhập số điện thoại"
            />
            <Select
              id="edit-status"
              label="Trạng thái hoạt động"
              required
              options={[
                { value: "ACTIVE", label: "Hoạt động" },
                { value: "INACTIVE", label: "Ngừng hoạt động" },
              ]}
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as "ACTIVE" | "INACTIVE" })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Quyền hạn (Vai trò)</label>
            <div className={styles.checkboxGrid}>
              {Object.keys(ASSIGNABLE_ROLES).map((role) => (
                <label key={role} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={editForm.authorities.includes(role)}
                    onChange={() => toggleEditRole(role)}
                    className={styles.checkboxInput}
                  />
                  {ASSIGNABLE_ROLES[role]}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditSubmit} icon="fi fi-rr-check">
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </Modal>

      {/* ConfirmDialog xóa tài khoản */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Xóa tài khoản"
        message={`Bạn có chắc chắn muốn xóa tài khoản "${deleteTarget?.username}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </section>
  );
}

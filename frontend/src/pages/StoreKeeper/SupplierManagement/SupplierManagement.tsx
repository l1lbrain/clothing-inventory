import { useState, useEffect } from "react";
import type { Supplier, SupplierFormData } from "../../../types/supplier.types";
import { Table } from "../../../components/Table/Table";
import { Button } from "../../../components/Button/Button";
import { Modal } from "../../../components/Modal/Modal";
import { SearchBox } from "../../../components/SearchBox/SearchBox";
import { Input } from "../../../components/Input/Input";
import { Select } from "../../../components/Select/Select";
import { Card, CardHeader, CardBody } from "../../../components/Card/Card";
import { Pagination } from "../../../components/Pagination/Pagination";
import type { TableColumn } from "../../../types/common.types";
import {
  validate,
  isRequired,
  isEmail,
  isPhone,
} from "../../../utils/validators";
import { useToast } from "../../../components/Toast/ToastContext";
import {
  getSuppliersPage,
  createSupplier,
  updateSupplier,
  patchSupplier,
} from "../../../services/supplier";
import { formatDateTime } from "../../../utils/formatters";
import styles from "./SupplierManagement.module.css";

const INITIAL_FORM: SupplierFormData = {
  companyName: "",
  taxCode: "",
  representative: "",
  address: "",
  email: "",
  phone: "",
  note: "",
  status: "active",
};

const STATUS_MAP = {
  active: "Hoạt động",
  inactive: "Ngừng hoạt động",
} as const;

type ModalMode = "add" | "edit" | "detail" | null;

const translateBackendError = (message: string): string => {
  const msg = message.toLowerCase();
  if (
    msg.includes("name already exists") ||
    msg.includes("tên") ||
    msg.includes("name")
  ) {
    if (msg.includes("exist") || msg.includes("tồn tại")) {
      return "Tên nhà cung cấp đã tồn tại trong hệ thống!";
    }
  }
  if (
    msg.includes("tax code") ||
    msg.includes("taxcode") ||
    msg.includes("mst") ||
    msg.includes("mã số thuế")
  ) {
    if (msg.includes("exist") || msg.includes("tồn tại")) {
      return "Mã số thuế đã tồn tại trong hệ thống!";
    }
  }
  if (msg.includes("email")) {
    if (msg.includes("exist") || msg.includes("tồn tại")) {
      return "Email đã tồn tại trong hệ thống!";
    }
  }
  if (
    msg.includes("phone") ||
    msg.includes("sđt") ||
    msg.includes("số điện thoại")
  ) {
    if (msg.includes("exist") || msg.includes("tồn tại")) {
      return "Số điện thoại đã tồn tại trong hệ thống!";
    }
  }
  if (msg.includes("code") || msg.includes("mã")) {
    if (msg.includes("exist") || msg.includes("tồn tại")) {
      return "Mã nhà cung cấp đã tồn tại trong hệ thống!";
    }
  }
  if (msg.includes("already exists") || msg.includes("tồn tại")) {
    return "Thông tin nhà cung cấp đã tồn tại trong hệ thống!";
  }
  return message;
};

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [form, setForm] = useState<SupplierFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [sortBy, setSortBy] = useState<"name" | "email" | "phone" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("");

  const { showToast } = useToast();

  // Debounce tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const data = await getSuppliersPage(
          currentPage,
          debouncedQuery || undefined,
          statusFilter || undefined,
          sortBy,
          sortDir
        );
        setSuppliers(data.items);
        setTotalElements(data.totalElements);
        setPageSize(data.pageSize);
      } catch (err) {
        console.error("Failed to fetch suppliers from backend API:", err);
        showToast("Không thể tải danh sách nhà cung cấp từ máy chủ!", "error");
        setSuppliers([]);
        setTotalElements(0);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, [currentPage, refreshTrigger, showToast, debouncedQuery, sortBy, sortDir, statusFilter]);

  const handleSort = (field: "name" | "email" | "phone" | "createdAt") => {
    console.log("[SupplierManagement Sort] Clicked:", field, "Current state:", { sortBy, sortDir });
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const buildSortHeader = (
    label: string,
    field: "name" | "email" | "phone" | "createdAt",
  ) => {
    const isActive = sortBy === field;
    const isAsc = isActive && sortDir === "asc";
    const iconClass = isAsc ? "fi fi-rr-caret-up" : "fi fi-rr-caret-down";

    return (
      <span
        className={styles.sortableHeader}
        onClick={() => handleSort(field)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleSort(field)}
      >
        {label}
        <i
          className={`${iconClass} ${isAsc ? styles.sortIconActive : styles.sortIcon}`}
        />
      </span>
    );
  };

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const isFormUnchanged = () => {
    if (!selectedSupplier) return true;
    return (
      form.companyName === selectedSupplier.companyName &&
      form.taxCode === selectedSupplier.taxCode &&
      form.representative === selectedSupplier.representative &&
      form.phone === selectedSupplier.phone &&
      form.email === selectedSupplier.email &&
      form.address === selectedSupplier.address &&
      form.note === (selectedSupplier.note || "") &&
      form.status === selectedSupplier.status
    );
  };

  const isFormInvalidForAdd = () => {
    return (
      !form.companyName ||
      !form.taxCode ||
      !form.representative ||
      !form.phone ||
      !form.email ||
      !form.address
    );
  };

  const openAdd = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSelectedSupplier(null);
    setModalMode("add");
  };

  const openEdit = (supplier: Supplier) => {
    setForm({
      companyName: supplier.companyName,
      taxCode: supplier.taxCode,
      representative: supplier.representative,
      address: supplier.address,
      email: supplier.email,
      phone: supplier.phone,
      note: supplier.note,
      status: supplier.status,
    });
    setErrors({});
    setSelectedSupplier(supplier);
    setModalMode("edit");
  };

  const openDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setModalMode("detail");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedSupplier(null);
    setErrors({});
  };

  const handleChange =
    (field: keyof SupplierFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const validateForm = () =>
    validate(form as unknown as Record<string, string>, {
      companyName: [isRequired],
      taxCode: [isRequired],
      representative: [isRequired],
      phone: [isRequired, isPhone],
      email: [isRequired, isEmail],
      address: [isRequired],
    });

  const handleAdd = async () => {
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    try {
      await createSupplier(form);
      showToast("Thêm nhà cung cấp mới thành công!", "success");
      closeModal();
      setCurrentPage(1);
      triggerRefresh();
    } catch (err) {
      console.error("Failed to create supplier:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Không thể tạo nhà cung cấp. Vui lòng thử lại!";
      showToast(translateBackendError(errMsg), "error");
    }
  };

  const handleEdit = async () => {
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    if (!selectedSupplier) return;

    const keys: (keyof SupplierFormData)[] = [
      "companyName",
      "taxCode",
      "representative",
      "address",
      "email",
      "phone",
      "note",
      "status",
    ];
    const changedFields: Partial<SupplierFormData> = {};
    let changedCount = 0;

    keys.forEach((key) => {
      const originalValue =
        selectedSupplier[key === "representative" ? "representative" : key] ||
        "";
      const currentValue = form[key] || "";

      if (currentValue !== originalValue) {
        if (key === "status") {
          changedFields.status = currentValue as "active" | "inactive";
        } else {
          changedFields[key] = currentValue;
        }
        changedCount++;
      }
    });

    if (changedCount === 0) {
      showToast("Không có thay đổi nào cần cập nhật!", "warning");
      closeModal();
      return;
    }

    try {
      if (changedCount === keys.length) {
        // Thay đổi toàn bộ -> Dùng PUT
        await updateSupplier(selectedSupplier.code, form);
      } else {
        // Thay đổi một phần -> Dùng PATCH
        await patchSupplier(selectedSupplier.code, changedFields);
      }
      // Cập nhật thẳng vào state bằng cách khớp theo code để tránh gọi API
      setSuppliers((prev) =>
        prev.map((s) =>
          s.code === selectedSupplier.code
            ? {
                ...s,
                companyName: form.companyName,
                taxCode: form.taxCode,
                representative: form.representative,
                contactPerson: form.representative,
                phone: form.phone,
                email: form.email,
                address: form.address,
                note: form.note,
                status: (form.status || "active") as "active" | "inactive",
              }
            : s
        )
      );
      showToast("Cập nhật thông tin nhà cung cấp thành công!", "success");
      closeModal();
    } catch (err) {
      console.error("Lỗi khi cập nhật nhà cung cấp:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Không thể cập nhật nhà cung cấp. Vui lòng thử lại!";
      showToast(translateBackendError(errMsg), "error");
    }
  };


  const columns: TableColumn<Supplier>[] = [
    { key: "code", label: "Mã NCC", width: "165px" },
    { key: "companyName", label: buildSortHeader("Tên NCC", "name") },
    { key: "contactPerson", label: "Người liên hệ" },
    { key: "phone", label: buildSortHeader("Số điện thoại", "phone"), width: "135px" },
    { key: "email", label: buildSortHeader("Email", "email") },
    {
      key: "status",
      label: "Trạng thái",
      width: "140px",
      align: "center",
      render: (val) => (
        <span
          className={[
            styles.badge,
            val === "active" ? styles.active : styles.inactive,
          ].join(" ")}
        >
          {STATUS_MAP[val as keyof typeof STATUS_MAP]}
        </span>
      ),
    },
    {
      key: "id",
      label: "Hành động",
      width: "160px",
      align: "center",
      render: (_, row) => (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            icon="fi fi-rr-eye"
            onClick={() => openDetail(row)}
          >
            Xem
          </Button>
        </div>
      ),
    },
  ];


  const renderForm = () => (
    <div className={styles.form}>
      <div className={styles.formRow}>
        <Input
          id="companyName"
          label="Tên công ty"
          required
          value={form.companyName}
          onChange={handleChange("companyName")}
          error={errors.companyName}
          placeholder="Nhập tên công ty"
        />
        <Input
          id="taxCode"
          label="Mã số thuế"
          required
          value={form.taxCode}
          onChange={handleChange("taxCode")}
          error={errors.taxCode}
          placeholder="Nhập mã số thuế"
        />
      </div>
      <div className={styles.formRow}>
        <Input
          id="representative"
          label="Người đại diện"
          required
          value={form.representative}
          onChange={handleChange("representative")}
          error={errors.representative}
          placeholder="Nhập tên người đại diện"
        />
        <Input
          id="phone"
          label="Số điện thoại"
          required
          value={form.phone}
          onChange={handleChange("phone")}
          error={errors.phone}
          placeholder="0901234567"
        />
      </div>
      <div className={styles.formRow}>
        <Input
          id="email"
          label="Email"
          required
          type="email"
          value={form.email}
          onChange={handleChange("email")}
          error={errors.email}
          placeholder="email@company.vn"
        />
        <Input
          id="address"
          label="Địa chỉ"
          required
          value={form.address}
          onChange={handleChange("address")}
          error={errors.address}
          placeholder="Nhập địa chỉ"
        />
      </div>
      <div className={styles.formRow}>
        <Select
          id="status"
          label="Trạng thái hoạt động"
          required
          options={[
            { value: "active", label: "Hoạt động" },
            { value: "inactive", label: "Ngừng hoạt động" },
          ]}
          value={form.status || "active"}
          onChange={handleChange("status")}
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="note" className={styles.label}>
          Ghi chú
        </label>
        <textarea
          id="note"
          className={styles.textarea}
          value={form.note}
          onChange={handleChange("note")}
          rows={3}
          placeholder="Ghi chú thêm..."
          maxLength={1000}
        />
      </div>
    </div>
  );

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Quản lý nhà cung cấp</h2>
            <p className={styles.subtitle}>
              {totalElements} nhà cung cấp
            </p>
          </div>
          <Button icon="fi fi-rr-add" onClick={openAdd} id="add-supplier-btn">
            Thêm mới
          </Button>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", maxWidth: "240px" }}>
          <Select
            id="statusFilter"
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "ACTIVE", label: "Đang hoạt động" },
              { value: "INACTIVE", label: "Ngừng hoạt động" },
            ]}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <Card>
          <CardHeader
            title="Danh sách nhà cung cấp"
            actions={
              <SearchBox
                placeholder="Tìm tên, mã, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
            }
          />
          <CardBody className={styles.tableBody}>
            <Table
              columns={columns}
              data={suppliers}
              rowKey="id"
              loading={loading}
              emptyText="Không tìm thấy nhà cung cấp"
            />
            {totalElements > 0 && (
              <div className={styles.paginationWrap}>
                <Pagination
                  pagination={{
                    page: currentPage,
                    pageSize: pageSize,
                    total: totalElements,
                  }}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={modalMode === "add"}
        onClose={closeModal}
        title="Thêm nhà cung cấp mới"
        size="lg"
      >
        {renderForm()}
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={closeModal}>
            Hủy
          </Button>
          <Button
            onClick={handleAdd}
            icon="fi fi-rr-check"
            disabled={isFormInvalidForAdd()}
          >
            Lưu nhà cung cấp
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={modalMode === "edit"}
        onClose={closeModal}
        title={`Chỉnh sửa: ${selectedSupplier?.companyName ?? ""}`}
        size="lg"
      >
        {renderForm()}
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={closeModal}>
            Hủy
          </Button>
          <Button
            onClick={handleEdit}
            icon="fi fi-rr-check"
            disabled={isFormUnchanged()}
          >
            Lưu thay đổi
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={modalMode === "detail"}
        onClose={closeModal}
        title="Chi tiết nhà cung cấp"
        size="lg"
      >
        {selectedSupplier && (
          <>
            <div className={styles.detail}>
              {Object.entries({
                "Mã NCC": selectedSupplier.code,
                "Tên công ty": selectedSupplier.companyName,
                "Mã số thuế": selectedSupplier.taxCode,
                "Người đại diện": selectedSupplier.representative,
                "Người liên hệ": selectedSupplier.contactPerson,
                "Số điện thoại": selectedSupplier.phone,
                Email: selectedSupplier.email,
                "Trạng thái": STATUS_MAP[selectedSupplier.status],
                "Địa chỉ": selectedSupplier.address,
                "Ghi chú": selectedSupplier.note || "—",
                "Ngày thêm": formatDateTime(selectedSupplier.createdAt),
                "Ngày cập nhật": formatDateTime(
                  selectedSupplier.updatedAt || selectedSupplier.createdAt,
                ),
              }).map(([k, v]) => {
                const isFullWidth = k === "Địa chỉ" || k === "Ghi chú";
                return (
                  <div
                    key={k}
                    className={[
                      styles.detailRow,
                      isFullWidth ? styles.detailRowFullWidth : "",
                    ].join(" ")}
                  >
                    <span className={styles.detailKey}>{k}</span>
                    <span className={styles.detailVal}>
                      {k === "Trạng thái" ? (
                        <span
                          className={[
                            styles.badge,
                            v === "Hoạt động" ? styles.active : styles.inactive,
                          ].join(" ")}
                        >
                          {v}
                        </span>
                      ) : (
                        v
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={closeModal}>
                Đóng
              </Button>
              <Button
                variant="secondary"
                icon="fi fi-rr-edit"
                onClick={() => openEdit(selectedSupplier)}
              >
                Chỉnh sửa
              </Button>
            </div>
          </>
        )}
      </Modal>

    </section>
  );
}

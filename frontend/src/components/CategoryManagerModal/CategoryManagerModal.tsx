import { useState, useEffect, useRef } from "react";
import { Modal } from "../Modal/Modal";
import { Button } from "../Button/Button";
import { useToast } from "../Toast/ToastContext";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryResponseDto,
} from "../../services/product";
import styles from "./CategoryManagerModal.module.css";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged: (categories: CategoryResponseDto[]) => void;
}

export function CategoryManagerModal({
  isOpen,
  onClose,
  onCategoriesChanged,
}: CategoryManagerModalProps) {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Trạng thái thêm mới
  const [newName, setNewName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const newInputRef = useRef<HTMLInputElement>(null);

  // Trạng thái đang sửa
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Trạng thái xóa
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Load danh mục khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getCategories()
      .then((data) => {
        setCategories(data);
      })
      .catch(() => showToast("Không thể tải danh mục", "error"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Reset khi đóng
  const handleClose = () => {
    setNewName("");
    setEditingId(null);
    setEditingName("");
    setDeletingId(null);
    onClose();
  };

  // Thêm danh mục
  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast("Tên danh mục không được để trống", "error");
      newInputRef.current?.focus();
      return;
    }
    setAddLoading(true);
    try {
      const created = await createCategory(trimmed);
      const updated = [...categories, created];
      setCategories(updated);
      onCategoriesChanged(updated);
      setNewName("");
      showToast(`Đã thêm danh mục "${created.name}"`, "success");
      newInputRef.current?.focus();
    } catch {
      showToast("Thêm danh mục thất bại. Vui lòng thử lại!", "error");
    } finally {
      setAddLoading(false);
    }
  };

  const handleNewKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
  };

  // Bắt đầu sửa
  const startEdit = (cat: CategoryResponseDto) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setDeletingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  // Xác nhận sửa
  const confirmEdit = async (id: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showToast("Tên danh mục không được để trống", "error");
      return;
    }
    // Lấy code hiện tại của category đang sửa
    const existingCategory = categories.find((c) => c.id === id);
    if (!existingCategory) return;

    setEditLoading(true);
    try {
      const updated = await updateCategory(id, trimmed, existingCategory.code);
      const newList = categories.map((c) => (c.id === id ? updated : c));
      setCategories(newList);
      onCategoriesChanged(newList);
      setEditingId(null);
      showToast(`Đã cập nhật danh mục "${updated.name}"`, "success");
    } catch {
      showToast("Cập nhật danh mục thất bại. Vui lòng thử lại!", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: number
  ) => {
    if (e.key === "Enter") confirmEdit(id);
    if (e.key === "Escape") cancelEdit();
  };

  // Xóa
  const handleDelete = async (id: number, name: string) => {
    if (deletingId !== id) {
      setDeletingId(id);
      setEditingId(null);
      return;
    }
    // Click lần 2 → xác nhận xóa
    try {
      await deleteCategory(id);
      const newList = categories.filter((c) => c.id !== id);
      setCategories(newList);
      onCategoriesChanged(newList);
      setDeletingId(null);
      showToast(`Đã xóa danh mục "${name}"`, "success");
    } catch (err: unknown) {
      setDeletingId(null);
      // Backend trả 409 nếu còn sản phẩm đang dùng danh mục này
      const msg =
        err instanceof Error && err.message.includes("409")
          ? `Không thể xóa danh mục "${name}" vì vẫn còn sản phẩm đang thuộc danh mục này.`
          : "Xóa danh mục thất bại. Vui lòng thử lại!";
      showToast(msg, "error");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Quản lý danh mục" size="md">
      <div className={styles.wrapper}>
        {/* Form thêm mới */}
        <div className={styles.addRow}>
          <input
            ref={newInputRef}
            className={styles.addInput}
            type="text"
            placeholder="Nhập tên danh mục mới..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleNewKeyDown}
            disabled={addLoading}
            maxLength={100}
          />
          <Button
            size="sm"
            icon="fi fi-rr-add"
            onClick={handleAdd}
            type="button"
            disabled={addLoading || !newName.trim()}
          >
            {addLoading ? "Đang thêm..." : "Thêm"}
          </Button>
        </div>

        {/* Danh sách */}
        <div className={styles.listWrapper}>
          {loading ? (
            <div className={styles.emptyState}>
              <i className="fi fi-rr-spinner" />
              <span>Đang tải danh mục...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fi fi-rr-box-open" />
              <span>Chưa có danh mục nào. Hãy thêm danh mục đầu tiên!</span>
            </div>
          ) : (
            <ul className={styles.list}>
              {categories.map((cat) => (
                <li key={cat.id} className={styles.item}>
                  {editingId === cat.id ? (
                    /* Chế độ sửa */
                    <div className={styles.editRow}>
                      <input
                        className={styles.editInput}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, cat.id)}
                        autoFocus
                        maxLength={100}
                        disabled={editLoading}
                      />
                      <div className={styles.editActions}>
                        <button
                          className={`${styles.iconBtn} ${styles.iconBtnSuccess}`}
                          onClick={() => confirmEdit(cat.id)}
                          disabled={editLoading}
                          title="Lưu"
                          type="button"
                        >
                          <i className="fi fi-rr-check" />
                        </button>
                        <button
                          className={styles.iconBtn}
                          onClick={cancelEdit}
                          disabled={editLoading}
                          title="Hủy"
                          type="button"
                        >
                          <i className="fi fi-rr-cross-small" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Chế độ xem */
                    <div className={styles.viewRow}>
                      <div className={styles.catInfo}>
                        <i className="fi fi-rr-tag" />
                        <span className={styles.catName}>{cat.name}</span>
                        <span className={styles.catCode}>{cat.code}</span>
                      </div>
                      <div className={styles.viewActions}>
                        <button
                          className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
                          onClick={() => startEdit(cat)}
                          title="Sửa tên"
                          type="button"
                        >
                          <i className="fi fi-rr-edit" />
                        </button>
                        <button
                          className={`${styles.iconBtn} ${
                            deletingId === cat.id
                              ? styles.iconBtnDangerConfirm
                              : styles.iconBtnDanger
                          }`}
                          onClick={() => handleDelete(cat.id, cat.name)}
                          title={
                            deletingId === cat.id
                              ? "Nhấn lần nữa để xác nhận xóa"
                              : "Xóa danh mục"
                          }
                          type="button"
                        >
                          <i
                            className={
                              deletingId === cat.id
                                ? "fi fi-rr-exclamation"
                                : "fi fi-rr-trash"
                            }
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cảnh báo xóa */}
                  {deletingId === cat.id && (
                    <p className={styles.deleteWarning}>
                      ⚠️ Nhấn nút xóa lần nữa để xác nhận. Nếu danh mục &ldquo;{cat.name}&rdquo; đang có sản phẩm, hệ thống sẽ từ chối xóa.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.count}>
            {categories.length} danh mục
          </span>
          <Button variant="secondary" size="sm" onClick={handleClose} type="button">
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}

import { useState, useEffect } from 'react';
import type { Supplier, SupplierFormData } from '../../../types/supplier.types';
import { useSearch } from '../../../hooks/useSearch';
import { Table } from '../../../components/Table/Table';
import { Button } from '../../../components/Button/Button';
import { Modal } from '../../../components/Modal/Modal';
import { SearchBox } from '../../../components/SearchBox/SearchBox';
import { Input } from '../../../components/Input/Input';
import { Card, CardHeader, CardBody } from '../../../components/Card/Card';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { Pagination } from '../../../components/Pagination/Pagination';
import type { TableColumn } from '../../../types/common.types';
import { validate, isRequired, isEmail, isPhone } from '../../../utils/validators';
import { useToast } from '../../../components/Toast/ToastContext';
import { getSuppliersPage, createSupplier, deleteSupplier, updateSupplier, patchSupplier } from '../../../services/supplier';
import { formatDateTime } from '../../../utils/formatters';
import styles from './SupplierManagement.module.css';

const INITIAL_FORM: SupplierFormData = {
  companyName: '', taxCode: '', representative: '',
  address: '', email: '', phone: '', note: '',
};

const STATUS_MAP = { active: 'Hoạt động', inactive: 'Ngừng hoạt động' } as const;

type ModalMode = 'add' | 'edit' | 'detail' | null;

const generateSupplierCode = (existingSuppliers: Supplier[]) => {
  let maxNum = 0;
  existingSuppliers.forEach((s) => {
    const match = s.code.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  });
  const nextNum = maxNum + 1;
  return `NCC${String(nextNum).padStart(3, '0')}`;
};

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { showToast } = useToast();

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const data = await getSuppliersPage(currentPage);
        setSuppliers(data.items);
        setTotalElements(data.totalElements);
        setPageSize(data.pageSize);
      } catch (err) {
        console.error('Failed to fetch suppliers from backend API:', err);
        showToast('Không thể tải danh sách nhà cung cấp từ máy chủ!', 'error');
        setSuppliers([]);
        setTotalElements(0);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, [currentPage, refreshTrigger, showToast]);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const { query, setQuery, filteredItems } = useSearch(suppliers, ['code', 'companyName', 'contactPerson', 'email']);

  const openAdd = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSelectedSupplier(null);
    setModalMode('add');
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
    });
    setErrors({});
    setSelectedSupplier(supplier);
    setModalMode('edit');
  };

  const openDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setModalMode('detail');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedSupplier(null);
    setErrors({});
  };

  const handleChange = (field: keyof SupplierFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
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
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const generatedCode = generateSupplierCode(suppliers);
      await createSupplier(form, generatedCode);
      showToast('Thêm nhà cung cấp mới thành công!', 'success');
      closeModal();
      setCurrentPage(1);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to create supplier:', err);
      showToast('Không thể tạo nhà cung cấp. Vui lòng thử lại!', 'error');
    }
  };

  const handleEdit = async () => {
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (!selectedSupplier) return;

    const keys: (keyof SupplierFormData)[] = ['companyName', 'taxCode', 'representative', 'address', 'email', 'phone', 'note'];
    const changedFields: Partial<SupplierFormData> = {};
    let changedCount = 0;

    keys.forEach((key) => {
      const originalValue = selectedSupplier[key === 'representative' ? 'representative' : key] || '';
      const currentValue = form[key] || '';
      
      if (currentValue !== originalValue) {
        changedFields[key] = currentValue;
        changedCount++;
      }
    });

    if (changedCount === 0) {
      showToast('Không có thay đổi nào cần cập nhật!', 'warning');
      closeModal();
      return;
    }

    try {
      if (changedCount === keys.length) {
        // Thay đổi toàn bộ các trường -> Dùng PUT
        await updateSupplier(selectedSupplier.code, form);
      } else {
        // Thay đổi một hoặc một vài trường -> Dùng PATCH
        await patchSupplier(selectedSupplier.code, changedFields);
      }
      showToast('Cập nhật thông tin nhà cung cấp thành công!', 'success');
      closeModal();
      triggerRefresh();
    } catch (err) {
      console.error('Lỗi khi cập nhật nhà cung cấp:', err);
      showToast('Không thể cập nhật nhà cung cấp. Vui lòng thử lại!', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = suppliers.find((s) => s.id === deleteId);
    if (!target) return;

    try {
      await deleteSupplier(target.code);
      showToast('Xóa nhà cung cấp thành công!', 'success');
      setDeleteId(null);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      showToast('Không thể xóa nhà cung cấp. Vui lòng thử lại!', 'error');
      setDeleteId(null);
    }
  };

  const columns: TableColumn<Supplier>[] = [
    { key: 'code', label: 'Mã NCC', width: '110px' },
    { key: 'companyName', label: 'Tên NCC' },
    { key: 'contactPerson', label: 'Người liên hệ' },
    { key: 'phone', label: 'Số điện thoại', width: '130px' },
    { key: 'email', label: 'Email' },
    {
      key: 'status', label: 'Trạng thái', width: '130px', align: 'center',
      render: (val) => (
        <span className={[styles.badge, val === 'active' ? styles.active : styles.inactive].join(' ')}>
          {STATUS_MAP[val as keyof typeof STATUS_MAP]}
        </span>
      ),
    },
    {
      key: 'id', label: 'Hành động', width: '160px', align: 'center',
      render: (_, row) => (
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" icon="fi fi-rr-eye" onClick={() => openDetail(row)}>Xem</Button>
          <Button variant="danger" size="sm" icon="fi fi-rr-trash" onClick={() => setDeleteId(row.id)}>Xóa</Button>
        </div>
      ),
    },
  ];

  const deleteTarget = suppliers.find((s) => s.id === deleteId);

  const renderForm = () => (
    <div className={styles.form}>
      <div className={styles.formRow}>
        <Input id="companyName" label="Tên công ty" required value={form.companyName} onChange={handleChange('companyName')} error={errors.companyName} placeholder="Nhập tên công ty" />
        <Input id="taxCode" label="Mã số thuế" required value={form.taxCode} onChange={handleChange('taxCode')} error={errors.taxCode} placeholder="Nhập mã số thuế" />
      </div>
      <div className={styles.formRow}>
        <Input id="representative" label="Người đại diện" required value={form.representative} onChange={handleChange('representative')} error={errors.representative} placeholder="Nhập tên người đại diện" />
        <Input id="phone" label="Số điện thoại" required value={form.phone} onChange={handleChange('phone')} error={errors.phone} placeholder="0901234567" />
      </div>
      <div className={styles.formRow}>
        <Input id="email" label="Email" required type="email" value={form.email} onChange={handleChange('email')} error={errors.email} placeholder="email@company.vn" />
        <Input id="address" label="Địa chỉ" required value={form.address} onChange={handleChange('address')} error={errors.address} placeholder="Nhập địa chỉ" />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="note" className={styles.label}>Ghi chú</label>
        <textarea id="note" className={styles.textarea} value={form.note} onChange={handleChange('note')} rows={3} placeholder="Ghi chú thêm..." maxLength={1000} />
      </div>
    </div>
  );

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Quản lý nhà cung cấp</h2>
            <p className={styles.subtitle}>{filteredItems.length} nhà cung cấp</p>
          </div>
          <Button icon="fi fi-rr-add" onClick={openAdd} id="add-supplier-btn">Thêm mới</Button>
        </div>

        <Card>
          <CardHeader
            title="Danh sách nhà cung cấp"
            actions={
              <SearchBox
                placeholder="Tìm theo tên, mã, email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClear={() => setQuery('')}
              />
            }
          />
          <CardBody className={styles.tableBody}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-subtext)' }}>
                Đang tải dữ liệu nhà cung cấp...
              </div>
            ) : (
              <>
                <Table columns={columns} data={filteredItems} rowKey="id" emptyText="Không tìm thấy nhà cung cấp" />
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
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={modalMode === 'add'} onClose={closeModal} title="Thêm nhà cung cấp mới" size="lg">
        {renderForm()}
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={closeModal}>Hủy</Button>
          <Button onClick={handleAdd} icon="fi fi-rr-check">Lưu nhà cung cấp</Button>
        </div>
      </Modal>

      <Modal isOpen={modalMode === 'edit'} onClose={closeModal} title={`Chỉnh sửa: ${selectedSupplier?.companyName ?? ''}`} size="lg">
        {renderForm()}
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={closeModal}>Hủy</Button>
          <Button onClick={handleEdit} icon="fi fi-rr-check">Lưu thay đổi</Button>
        </div>
      </Modal>

      <Modal isOpen={modalMode === 'detail'} onClose={closeModal} title="Chi tiết nhà cung cấp">
        {selectedSupplier && (
          <>
            <div className={styles.detail}>
              {(Object.entries({
                'Mã NCC': selectedSupplier.code,
                'Tên công ty': selectedSupplier.companyName,
                'Mã số thuế': selectedSupplier.taxCode,
                'Người đại diện': selectedSupplier.representative,
                'Người liên hệ': selectedSupplier.contactPerson,
                'Số điện thoại': selectedSupplier.phone,
                'Email': selectedSupplier.email,
                'Địa chỉ': selectedSupplier.address,
                'Ghi chú': selectedSupplier.note || '—',
                'Ngày thêm': formatDateTime(selectedSupplier.createdAt),
                'Ngày cập nhật': formatDateTime(selectedSupplier.updatedAt || selectedSupplier.createdAt),
                'Trạng thái': STATUS_MAP[selectedSupplier.status],
              })).map(([k, v]) => (
                <div key={k} className={styles.detailRow}>
                  <span className={styles.detailKey}>{k}</span>
                  <span className={styles.detailVal}>{v}</span>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={closeModal}>Đóng</Button>
              <Button variant="secondary" icon="fi fi-rr-edit" onClick={() => openEdit(selectedSupplier)}>Chỉnh sửa</Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Xóa nhà cung cấp"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.companyName}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </section>
  );
}

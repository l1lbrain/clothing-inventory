import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductFormData } from '../../../types/product.types';
import { PRODUCT_CATEGORY_LABELS } from '../../../data/products.mock';
import { Input } from '../../../components/Input/Input';
import { Select } from '../../../components/Select/Select';
import { Button } from '../../../components/Button/Button';
import { Card, CardHeader, CardBody } from '../../../components/Card/Card';
import { validate, isRequired, isPositiveNumber } from '../../../utils/validators';
import { ROUTES } from '../../../constants/routes';
import styles from './CreateProduct.module.css';

const CATEGORY_OPTIONS = Object.entries(PRODUCT_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }));
const UNIT_OPTIONS = [
  { value: 'Cái', label: 'Cái' },
  { value: 'Đôi', label: 'Đôi' },
  { value: 'Bộ', label: 'Bộ' },
  { value: 'Chiếc', label: 'Chiếc' },
];

const INITIAL: ProductFormData = {
  sku: '', name: '', category: 'ao',
  importPrice: '', salePrice: '', unit: 'Cái',
  description: '', image: '',
};

interface ProductAttribute {
  name: string;
  values: string[];
}

export function CreateProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductFormData>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [tagInputs, setTagInputs] = useState<string[]>(['', '', '']);

  const addAttribute = () => {
    if (attributes.length >= 3) return;
    const defaultNames = ['Màu sắc', 'Kích thước', 'Chất liệu'];
    const name = defaultNames.find(dName => !attributes.some(attr => attr.name === dName)) || '';
    setAttributes(prev => [...prev, { name, values: [] }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, idx) => idx !== index));
    setTagInputs(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      copy.push(''); // Keep length 3
      return copy;
    });
  };

  const updateAttributeName = (index: number, name: string) => {
    setAttributes(prev => prev.map((attr, idx) => {
      if (idx !== index) return attr;
      return { ...attr, name };
    }));
  };

  const updateTagInput = (index: number, value: string) => {
    setTagInputs(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const removeAttributeValue = (attrIndex: number, valIndex: number) => {
    setAttributes(prev => prev.map((attr, idx) => {
      if (idx !== attrIndex) return attr;
      return {
        ...attr,
        values: attr.values.filter((_, vIdx) => vIdx !== valIndex)
      };
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, attrIndex: number) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = tagInputs[attrIndex].trim();
      if (value) {
        const newVals = value.split(',').map(v => v.trim()).filter(Boolean);
        setAttributes(prev => prev.map((attr, idx) => {
          if (idx !== attrIndex) return attr;
          const filtered = newVals.filter(v => !attr.values.includes(v));
          return {
            ...attr,
            values: [...attr.values, ...filtered]
          };
        }));
        setTagInputs(prev => {
          const copy = [...prev];
          copy[attrIndex] = '';
          return copy;
        });
      }
    } else if (e.key === 'Backspace' && !tagInputs[attrIndex]) {
      setAttributes(prev => prev.map((attr, idx) => {
        if (idx !== attrIndex || attr.values.length === 0) return attr;
        return {
          ...attr,
          values: attr.values.slice(0, -1)
        };
      }));
    }
  };

  const handleTagBlur = (attrIndex: number) => {
    const value = tagInputs[attrIndex].trim();
    if (value) {
      const newVals = value.split(',').map(v => v.trim()).filter(Boolean);
      setAttributes(prev => prev.map((attr, idx) => {
        if (idx !== attrIndex) return attr;
        const filtered = newVals.filter(v => !attr.values.includes(v));
        return {
          ...attr,
          values: [...attr.values, ...filtered]
        };
      }));
      setTagInputs(prev => {
        const copy = [...prev];
        copy[attrIndex] = '';
        return copy;
      });
    }
  };

  const handleChange = (field: keyof ProductFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

  const handlePriceChange = (field: 'importPrice' | 'salePrice') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawVal = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
      setForm((prev) => ({ ...prev, [field]: rawVal }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

  const formatInputNumber = (val: string | number) => {
    if (!val && val !== 0) return '';
    const cleanVal = String(val).replace(/\./g, '').replace(/[^0-9]/g, '');
    if (!cleanVal) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(cleanVal));
  };

  const handleSubmit = () => {
    const errs = validate(form as unknown as Record<string, string>, {
      sku: [isRequired],
      name: [isRequired],
      category: [isRequired],
      importPrice: [(v) => isPositiveNumber(v)],
      salePrice: [(v) => isPositiveNumber(v)],
    });

    if (Object.keys(errs).length) { setErrors(errs); return; }

    console.log('Tạo sản phẩm:', { ...form, attributes });
    navigate(ROUTES.WAREHOUSE_PRODUCTS);
  };

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Tạo sản phẩm mới</h2>
            <p className={styles.subtitle}>Thêm sản phẩm vào hệ thống kho</p>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.mainCol}>
            <Card>
              <CardHeader title="Thông tin cơ bản" />
              <CardBody>
                <div className={styles.formGrid}>
                  <Input id="sku" label="SKU" required value={form.sku} onChange={handleChange('sku')} error={errors.sku} placeholder="VD: AO-003" />
                  <Input id="name" label="Tên sản phẩm" required value={form.name} onChange={handleChange('name')} error={errors.name} placeholder="Nhập tên sản phẩm" />
                  <Select id="category" label="Danh mục" required options={CATEGORY_OPTIONS} value={form.category} onChange={handleChange('category')} error={errors.category} />
                  <Select id="unit" label="Đơn vị tính" options={UNIT_OPTIONS} value={form.unit} onChange={handleChange('unit')} />
                  <Input id="importPrice" label="Giá nhập" required type="text" suffix="VND" value={formatInputNumber(form.importPrice)} onChange={handlePriceChange('importPrice')} error={errors.importPrice} placeholder="0" />
                  <Input id="salePrice" label="Giá bán" required type="text" suffix="VND" value={formatInputNumber(form.salePrice)} onChange={handlePriceChange('salePrice')} error={errors.salePrice} placeholder="0" />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="description" className={styles.label}>Mô tả sản phẩm</label>
                  <textarea id="description" className={styles.textarea} rows={4} value={form.description} onChange={handleChange('description')} placeholder="Nhập mô tả sản phẩm..." maxLength={1000} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Thuộc tính sản phẩm"
                actions={
                  attributes.length < 3 ? (
                    <Button variant="secondary" size="sm" icon="fi fi-rr-add" onClick={addAttribute} type="button">
                      Thêm thuộc tính
                    </Button>
                  ) : undefined
                }
              />
              <CardBody>
                {attributes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-subtext)', fontSize: 'var(--font-base)' }}>
                    Sản phẩm này chưa có thuộc tính (VD: kích thước, màu sắc). Nhấp "Thêm thuộc tính" để cấu hình.
                  </div>
                ) : (
                  <div className={styles.attrList}>
                    {attributes.map((attr, index) => (
                      <div key={index} className={styles.attrRow}>
                        <div className={styles.attrNameGroup}>
                          <Input
                            id={`attr-name-${index}`}
                            label={`Tên thuộc tính ${index + 1}`}
                            placeholder="VD: Màu sắc, Kích thước..."
                            value={attr.name}
                            onChange={(e) => updateAttributeName(index, e.target.value)}
                          />
                        </div>
                        <div className={styles.attrValueGroup}>
                          <label className={styles.label}>Giá trị thuộc tính</label>
                          <div 
                            className={styles.tagsInputWrapper}
                            onClick={() => document.getElementById(`attr-input-${index}`)?.focus()}
                          >
                            {attr.values.map((val, valIdx) => (
                              <span key={valIdx} className={styles.tag}>
                                {val}
                                <button type="button" onClick={() => removeAttributeValue(index, valIdx)} aria-label="Xóa">
                                  <i className="fi fi-rr-cross-small" />
                                </button>
                              </span>
                            ))}
                            <input
                              id={`attr-input-${index}`}
                              type="text"
                              className={styles.tagInput}
                              placeholder={attr.values.length === 0 ? "Nhập giá trị..." : "Thêm..."}
                              value={tagInputs[index]}
                              onChange={(e) => updateTagInput(index, e.target.value)}
                              onKeyDown={(e) => handleTagKeyDown(e, index)}
                              onBlur={() => handleTagBlur(index)}
                            />
                          </div>
                        </div>
                        <div className={styles.attrDeleteGroup}>
                          <Button variant="danger" onClick={() => removeAttribute(index)} icon="fi fi-rr-trash" type="button">
                            Xóa
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card>
              <CardHeader title="Hình ảnh" />
              <CardBody>
                <div className={styles.imageUpload}>
                  <i className="fi fi-rr-picture" aria-hidden />
                  <p>Kéo thả hoặc chọn hình ảnh</p>
                  <Button variant="secondary" size="sm" icon="fi fi-rr-upload">Tải lên</Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className={styles.actions}>
                  <Button variant="secondary" onClick={() => navigate(-1)} icon="fi fi-rr-arrow-left">Hủy</Button>
                  <Button onClick={handleSubmit} icon="fi fi-rr-check">Lưu sản phẩm</Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

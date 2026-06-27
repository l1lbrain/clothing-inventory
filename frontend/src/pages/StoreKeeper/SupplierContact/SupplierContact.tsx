import { useState, useEffect } from "react";
import { Card, CardBody } from "../../../components/Card/Card";
import { Button } from "../../../components/Button/Button";
import { useToast } from "../../../components/Toast/ToastContext";
import { getSuppliersPage } from "../../../services/supplier";
import type { Supplier } from "../../../types/supplier.types";
import styles from "./SupplierContact.module.css";

export function SupplierContact() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const data = await getSuppliersPage(1);
        setSuppliers(data.items);
      } catch (err) {
        console.error("Failed to fetch contact suppliers:", err);
      }
    };
    fetchSuppliers();
  }, []);

  const activeSuppliers = suppliers.filter((s) => s.status === "active");

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Liên hệ đặt hàng</h2>
            <p className={styles.subtitle}>
              {activeSuppliers.length} nhà cung cấp đang hoạt động
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          {activeSuppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardBody>
                <div className={styles.cardContent}>
                  <div>
                    <h3 className={styles.companyName}>
                      {supplier.companyName}
                    </h3>
                    <span className={styles.code}>{supplier.code}</span>
                  </div>

                  <div className={styles.contactInfo}>
                    <div className={styles.infoRow}>
                      <i className="fi fi-rr-user" aria-hidden />
                      <span>{supplier.contactPerson}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <i className="fi fi-rr-phone-call" aria-hidden />
                      <span>{supplier.phone}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <i className="fi fi-rr-envelope" aria-hidden />
                      <span>{supplier.email}</span>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="fi fi-rr-phone-call"
                      onClick={() => {
                        const isMobile =
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                            navigator.userAgent,
                          );
                        if (isMobile) {
                          window.location.href = `tel:${supplier.phone}`;
                        } else {
                          navigator.clipboard.writeText(supplier.phone);
                          showToast(
                            `Đã sao chép số điện thoại "${supplier.phone}" vào bộ nhớ tạm.`,
                            "success",
                          );
                        }
                      }}
                    >
                      Gọi điện
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon="fi fi-rr-envelope"
                      onClick={() => window.open(`mailto:${supplier.email}`)}
                    >
                      Gửi Email
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

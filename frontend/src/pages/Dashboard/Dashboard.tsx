import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import styles from "./Dashboard.module.css";
import { Card, CardBody } from "../../components/Card/Card";
import { formatCurrency } from "../../utils/formatters";
import { getSuppliersPage } from "../../services/supplier";
import { getProductsPage } from "../../services/product";
import { getUserAuthorities } from "../../services/auth";
import { ROUTES } from "../../constants/routes";
import type { Product } from "../../types/product.types";

const totalRevenue = 0;

export function Dashboard() {
  const authorities = getUserAuthorities();
  const isAdmin = authorities.includes("admin");

  // State quản lý sản phẩm / NCC
  const [supplierCount, setSupplierCount] = useState<number | string>("...");
  const [productCount, setProductCount] = useState<number | string>("...");
  const [totalStock, setTotalStock] = useState<number | string>("...");
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    getSuppliersPage(1)
      .then((res) => {
        setSupplierCount(res.totalElements);
      })
      .catch((err) => {
        console.error("Lỗi tải số lượng nhà cung cấp:", err);
        setSupplierCount(0);
      });
  }, []);

  useEffect(() => {
    getProductsPage(1)
      .then(async (firstPage) => {
        setProductCount(firstPage.totalElements);

        let allItems = [...firstPage.items];
        const totalPages = firstPage.totalPages;

        if (totalPages > 1) {
          const promises = [];
          for (let p = 2; p <= totalPages; p++) {
            promises.push(getProductsPage(p));
          }
          const results = await Promise.all(promises);
          results.forEach((res) => {
            allItems = allItems.concat(res.items);
          });
        }

        const stockSum = allItems.reduce((sum, item) => sum + item.stock, 0);
        setTotalStock(stockSum);
        setLowStockProducts(allItems.filter((p) => p.stock < 25));
      })
      .catch((err) => {
        console.error("Lỗi tải dữ liệu sản phẩm cho dashboard:", err);
        setProductCount(0);
        setTotalStock(0);
        setLowStockProducts([]);
      });
  }, []);

  const stats = [
    {
      label: "Tổng doanh thu nhập",
      value: formatCurrency(totalRevenue),
      icon: "fi fi-rr-sack-dollar",
      color: "primary",
    },
    {
      label: "Tổng sản phẩm",
      value: productCount.toString(),
      icon: "fi fi-rr-box-alt",
      color: "success",
    },
    {
      label: "Nhà cung cấp",
      value: supplierCount.toString(),
      icon: "fi fi-rr-building",
      color: "warning",
    },
    {
      label: "Tổng tồn kho",
      value: totalStock === "..." ? "..." : `${totalStock} sản phẩm`,
      icon: "fi fi-rr-warehouse-alt",
      color: "info",
    },
  ];

  if (!isAdmin) {
    return <Navigate to={ROUTES.PROFILE} replace />;
  }

  return (
    <section>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Quản trị hệ thống</h2>
            <p className={styles.subtitle}>Bảng quản lý dành riêng cho Admin</p>
          </div>
        </div>

        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardBody className={styles.statCard}>
                <div className={[styles.statIcon, styles[stat.color]].join(" ")}>
                  <i className={stat.icon} aria-hidden />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{stat.value}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className={styles.content}>
          <Card>
            <div className={styles.recentHeader}>
              <span className={styles.recentTitle}>Phiếu nhập gần đây</span>
            </div>
            <div className={styles.recentList}>
              <div style={{ padding: "20px", textAlign: "center", color: "var(--color-subtext)" }}>
                Chưa có giao dịch gần đây
              </div>
            </div>
          </Card>

          <Card>
            <div className={styles.recentHeader}>
              <span className={styles.recentTitle}>Sản phẩm sắp hết hàng</span>
            </div>
            <div className={styles.recentList}>
              {lowStockProducts.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--color-subtext)",
                  }}
                >
                  Không có sản phẩm nào sắp hết hàng
                </div>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product.id} className={styles.recentItem}>
                    <div className={styles.recentLeft}>
                      <div className={styles.productThumb}>
                        <i className="fi fi-rr-shirt" aria-hidden />
                      </div>
                      <div>
                        <p className={styles.receiptCode}>{product.name}</p>
                        <p className={styles.receiptSupplier}>{product.sku}</p>
                      </div>
                    </div>
                    <div className={styles.recentRight}>
                      <span
                        className={[
                          styles.receiptStatus,
                          product.stock < 20 ? styles.unpaid : styles.partial,
                        ].join(" ")}
                      >
                        Còn {product.stock}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

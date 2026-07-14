/**
 * Định dạng tên hiển thị của biến thể từ productName + các option.
 * Dùng chung cho PurchaseOrder và WarehouseReceipt.
 */
export function formatVariantName(
  productName: string,
  option1: string | null,
  option2: string | null,
  option3: string | null,
): string {
  const opts = [option1, option2, option3]
    .filter((o): o is string => Boolean(o && o.trim()))
    .join(" / ");
  return opts ? `${productName} ${opts}` : productName;
}

/** Format số thành chuỗi tiền Việt với dấu chấm phân cách. */
export function formatInputNumber(val: string | number): string {
  if (!val && val !== 0) return "";
  const cleanVal = String(val)
    .replace(/\./g, "")
    .replace(/[^0-9]/g, "");
  if (!cleanVal) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(cleanVal));
}

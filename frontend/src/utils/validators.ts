export function isRequired(value: string): string | null {
  return value.trim() ? null : "Trường này là bắt buộc";
}

export function isEmail(value: string): string | null {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value) ? null : "Email không hợp lệ";
}

export function isPhone(value: string): string | null {
  const re = /^(0|\+84)[0-9]{9}$/;
  return re.test(value.replace(/\s/g, ""))
    ? null
    : "Số điện thoại không hợp lệ";
}

export function isPositiveNumber(value: number | string): string | null {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return !isNaN(num) && num > 0 ? null : "Giá trị phải lớn hơn 0";
}

export function isGreaterThanZero(value: number | string): boolean {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
}

export function validate(
  fields: Record<string, string>,
  rules: Record<string, Array<(v: string) => string | null>>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const error = rule(fields[field] ?? "");
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }

  return errors;
}

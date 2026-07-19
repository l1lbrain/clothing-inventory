import { describe, expect, it } from "vitest";
import { isEmail, isPositiveNumber, isRequired, validate } from "./validators";

describe("validators", () => {
  it("validates individual values", () => {
    expect(isRequired("  ")).toBe("Trường này là bắt buộc");
    expect(isRequired("Áo sơ mi")).toBeNull();
    expect(isEmail("inventory@example.com")).toBeNull();
    expect(isEmail("inventory@example")).toBe("Email không hợp lệ");
    expect(isPositiveNumber("10.5")).toBeNull();
    expect(isPositiveNumber(0)).toBe("Giá trị phải lớn hơn 0");
  });

  it("returns the first error for each field", () => {
    expect(
      validate(
        { email: "not-an-email", name: "" },
        {
          email: [isRequired, isEmail],
          name: [isRequired],
        },
      ),
    ).toEqual({
      email: "Email không hợp lệ",
      name: "Trường này là bắt buộc",
    });
  });
});

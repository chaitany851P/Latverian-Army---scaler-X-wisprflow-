import { describe, expect, it } from "vitest";
import { formatPaiseAsRupees, rupeesToPaise, splitMrpInclusiveTax } from "./money.js";

describe("integer paise financial utilities", () => {
  it("converts decimal rupees to exact integer paise without float drift", () => {
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });

  it("formats positive and negative paise safely", () => {
    expect(formatPaiseAsRupees(1250)).toBe("12.50");
    expect(formatPaiseAsRupees(-405)).toBe("-4.05");
  });

  it("back-calculates MRP-inclusive GST without inflating total price", () => {
    const split = splitMrpInclusiveTax(11800, 18);
    expect(split).toEqual({ basePaise: 10000, taxPaise: 1800 });
    expect(split.basePaise + split.taxPaise).toBe(11800);
  });

  it("rejects negative or non-integer inputs", () => {
    expect(() => rupeesToPaise(-1)).toThrow(RangeError);
    expect(() => formatPaiseAsRupees(12.5)).toThrow(RangeError);
  });
});

import { describe, expect, it } from "vitest";
import { truncateTitle } from "../src/title";

describe("truncateTitle", () => {
  it("keeps titles within the limit as they are", () => {
    expect(truncateTitle("Short", 10)).toBe("Short");
    expect(truncateTitle("1234567890", 10)).toBe("1234567890");
  });

  it("cuts longer titles to the limit, ellipsis included", () => {
    expect(truncateTitle("A very long page title", 10)).toBe("A very lo…");
    expect(Array.from(truncateTitle("A very long page title", 10)).length).toBeLessThanOrEqual(10);
  });

  it("counts characters, not UTF-16 units, so emoji are never split", () => {
    expect(truncateTitle("日本語のとても長いタイトル", 5)).toBe("日本語の…");
    expect(truncateTitle("😀😀😀😀😀😀", 3)).toBe("😀😀…");
  });

  it("treats 0, negative and invalid limits as no limit", () => {
    const long = "x".repeat(500);
    expect(truncateTitle(long, 0)).toBe(long);
    expect(truncateTitle(long, -1)).toBe(long);
    expect(truncateTitle(long, Number.NaN)).toBe(long);
  });
});

/**
 * Phase 6 — Task 6.2 (lib/utils.ts)
 * Tests formatting helpers: formatCurrency, formatDate, formatPercent, formatNumber.
 */
import { describe, it, expect } from "vitest"
import { formatCurrency, formatDate, formatPercent, formatNumber } from "@/lib/utils"

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe("formatCurrency", () => {
  it("formats a whole number with dollar sign and commas", () => {
    expect(formatCurrency(10000)).toBe("$10,000")
  })

  it("rounds to zero decimal places", () => {
    // 1234.56 rounds to 1235
    expect(formatCurrency(1234.56)).toBe("$1,235")
  })

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0")
  })

  it("formats large amounts correctly", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000")
  })

  it("supports a non-default currency", () => {
    const result = formatCurrency(5000, "INR")
    // Should contain the amount with commas; exact symbol varies by locale support
    expect(result).toContain("5,000")
  })
})

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe("formatDate", () => {
  it("formats a valid ISO date string to 'MMM d, yyyy' by default", () => {
    expect(formatDate("2024-01-15T00:00:00Z")).toBe("Jan 15, 2024")
  })

  it("returns an em dash for null", () => {
    expect(formatDate(null)).toBe("—")
  })

  it("returns an em dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—")
  })

  it("returns the original string when input cannot be parsed", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date")
  })

  it("accepts a custom format string", () => {
    expect(formatDate("2024-06-01T00:00:00Z", "yyyy/MM/dd")).toBe("2024/06/01")
  })

  it("handles end-of-year dates", () => {
    expect(formatDate("2023-12-31T00:00:00Z")).toBe("Dec 31, 2023")
  })
})

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------
describe("formatPercent", () => {
  it("formats with 1 decimal place by default", () => {
    expect(formatPercent(12.345)).toBe("12.3%")
  })

  it("rounds the last decimal place", () => {
    expect(formatPercent(12.356)).toBe("12.4%")
  })

  it("accepts a custom decimals argument", () => {
    expect(formatPercent(5.6789, 2)).toBe("5.68%")
  })

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0.0%")
  })

  it("handles 100%", () => {
    expect(formatPercent(100, 0)).toBe("100%")
  })
})

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------
describe("formatNumber", () => {
  it("formats a million with commas", () => {
    expect(formatNumber(1000000)).toBe("1,000,000")
  })

  it("handles small numbers without commas", () => {
    expect(formatNumber(42)).toBe("42")
  })

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0")
  })

  it("handles numbers in the thousands", () => {
    expect(formatNumber(12345)).toBe("12,345")
  })
})

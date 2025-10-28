import { describe, it, expect, beforeEach } from "vitest";
import { DateValidator } from "../core/validator.js";

describe("DateValidator", () => {
  let validator: DateValidator;

  beforeEach(() => {
    validator = new DateValidator();
  });

  describe("validateISOFormat", () => {
    it("should validate correct ISO date format", () => {
      const result = validator.validateISOFormat("2025-01-15T14:30");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate ISO date with seconds", () => {
      const result = validator.validateISOFormat("2025-01-15T14:30:45");
      expect(result.isValid).toBe(true);
    });

    it("should validate ISO date with timezone", () => {
      const result = validator.validateISOFormat("2025-01-15T14:30:00Z");
      expect(result.isValid).toBe(true);
    });

    it("should reject invalid date format", () => {
      const result = validator.validateISOFormat("15-01-2025 14:30");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject malformed date", () => {
      const result = validator.validateISOFormat("not-a-date");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject invalid date values", () => {
      const result = validator.validateISOFormat("2025-13-32T25:61");
      expect(result.isValid).toBe(false);
    });
  });

  describe("parseDate", () => {
    it("should parse ISO date without timezone", () => {
      const date = validator.parseDate("2025-01-15T14:30");
      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString()).toBe("2025-01-15T14:30:00.000Z");
    });

    it("should parse ISO date with Z timezone", () => {
      const date = validator.parseDate("2025-01-15T14:30:00Z");
      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString()).toBe("2025-01-15T14:30:00.000Z");
    });

    it("should parse ISO date with offset timezone", () => {
      const date = validator.parseDate("2025-01-15T14:30:00+03:00");
      expect(date).toBeInstanceOf(Date);
    });

    it("should return null for invalid date", () => {
      const date = validator.parseDate("invalid-date");
      expect(date).toBeNull();
    });

    it("should return null for malformed ISO date", () => {
      const date = validator.parseDate("2025-13-32T25:61");
      expect(date).toBeNull();
    });
  });

  describe("getValidDateRange", () => {
    it("should return range with no lower bound when no previous commit", () => {
      const now = new Date();
      const range = validator.getValidDateRange(null, null);

      expect(range.min).toBeNull();
      expect(range.max.getTime()).toBeLessThanOrEqual(now.getTime() + 1000); // Allow 1s tolerance
    });

    it("should return range with previous commit as lower bound", () => {
      const prevDate = new Date("2025-01-15T10:00:00Z");
      const range = validator.getValidDateRange(prevDate, null);

      expect(range.min).toEqual(prevDate);
      expect(range.max).toBeInstanceOf(Date);
    });

    it("should return range with next commit as upper bound when it is before now", () => {
      const prevDate = new Date("2025-01-15T10:00:00Z");
      const nextDate = new Date("2025-01-15T12:00:00Z");
      const range = validator.getValidDateRange(prevDate, nextDate);

      expect(range.min).toEqual(prevDate);
      expect(range.max).toEqual(nextDate);
    });

    it("should use now as upper bound when next commit is in the future", () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // Tomorrow
      const range = validator.getValidDateRange(null, futureDate);

      expect(range.max.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });
  });

  describe("validateDate", () => {
    it("should reject future dates", () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour in future
      const result = validator.validateDate(futureDate, null, null);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("future");
    });

    it("should reject date before previous commit", () => {
      const prevDate = new Date("2025-01-15T10:00:00Z");
      const newDate = new Date("2025-01-15T09:00:00Z");
      const result = validator.validateDate(newDate, prevDate, null);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("earlier");
    });

    it("should reject date after next commit", () => {
      const nextDate = new Date("2025-01-15T12:00:00Z");
      const newDate = new Date("2025-01-15T13:00:00Z");
      const result = validator.validateDate(newDate, null, nextDate);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("later");
    });

    it("should accept valid date between commits", () => {
      const prevDate = new Date("2025-01-15T10:00:00Z");
      const nextDate = new Date("2025-01-15T12:00:00Z");
      const newDate = new Date("2025-01-15T11:00:00Z");
      const result = validator.validateDate(newDate, prevDate, nextDate);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept date equal to previous commit", () => {
      const prevDate = new Date("2025-01-15T10:00:00Z");
      const newDate = new Date("2025-01-15T10:00:00Z");
      const result = validator.validateDate(newDate, prevDate, null);

      expect(result.isValid).toBe(true);
    });

    it("should accept past date with no boundaries", () => {
      const pastDate = new Date("2025-01-15T10:00:00Z");
      const result = validator.validateDate(pastDate, null, null);

      expect(result.isValid).toBe(true);
    });
  });

  describe("formatDate", () => {
    it("should format date in readable ISO format", () => {
      const date = new Date("2025-01-15T14:30:45.123Z");
      const formatted = validator.formatDate(date);

      expect(formatted).toBe("2025-01-15T14:30:45");
    });

    it("should remove milliseconds and Z suffix", () => {
      const date = new Date("2025-01-15T14:30:00.000Z");
      const formatted = validator.formatDate(date);

      expect(formatted).not.toContain(".000");
      expect(formatted).not.toContain("Z");
    });
  });

  describe("formatDateRange", () => {
    it("should format range with both boundaries", () => {
      const min = new Date("2025-01-15T10:00:00Z");
      const max = new Date("2025-01-15T12:00:00Z");
      const formatted = validator.formatDateRange({ min, max });

      expect(formatted).toContain("2025-01-15T10:00:00");
      expect(formatted).toContain("2025-01-15T12:00:00");
      expect(formatted).toContain("—");
    });

    it("should format range with no lower bound", () => {
      const max = new Date("2025-01-15T12:00:00Z");
      const formatted = validator.formatDateRange({ min: null, max });

      expect(formatted).toContain("no limit");
      expect(formatted).toContain("2025-01-15T12:00:00");
    });

    it("should use dash separator", () => {
      const min = new Date("2025-01-15T10:00:00Z");
      const max = new Date("2025-01-15T12:00:00Z");
      const formatted = validator.formatDateRange({ min, max });

      expect(formatted).toMatch(/—/);
    });
  });
});

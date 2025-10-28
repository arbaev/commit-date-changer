import { isValid, parseISO, isBefore, isAfter } from "date-fns";
import { DateRange, ValidationResult } from "../types/index.js";
import { t } from "../i18n.js";

/**
 * Date validator for commits
 */
export class DateValidator {
  /**
   * Validate date string in ISO format
   */
  validateISOFormat(dateString: string): ValidationResult {
    try {
      const date = parseISO(dateString);

      if (!isValid(date)) {
        return {
          isValid: false,
          error: t("validator.invalidDate"),
        };
      }

      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: t("validator.parseError"),
      };
    }
  }

  /**
   * Parse date from ISO string
   * Parse as UTC, adding 'Z' to string if it's not present
   */
  parseDate(dateString: string): Date | null {
    try {
      // If string doesn't contain timezone (Z or +HH:MM), add Z for UTC
      let dateStr = dateString;
      if (!dateStr.endsWith("Z") && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
        dateStr = dateString + "Z";
      }
      const date = parseISO(dateStr);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  }

  /**
   * Get valid date range for commit
   */
  getValidDateRange(prevCommitDate: Date | null, nextCommitDate: Date | null): DateRange {
    const now = new Date();

    // Max = minimum of (current time, next commit date)
    let max = now;
    if (nextCommitDate && isBefore(nextCommitDate, now)) {
      max = nextCommitDate;
    }

    return {
      min: prevCommitDate,
      max,
    };
  }

  /**
   * Validate new date relative to neighboring commits
   */
  validateDate(
    newDate: Date,
    prevCommitDate: Date | null,
    nextCommitDate: Date | null,
  ): ValidationResult {
    const now = new Date();

    // Check 1: Date is not in the future
    if (isAfter(newDate, now)) {
      return {
        isValid: false,
        error: t("validator.futureDate"),
      };
    }

    // Check 2: Date is not earlier than previous commit
    if (prevCommitDate && isBefore(newDate, prevCommitDate)) {
      return {
        isValid: false,
        error: `${t("validator.beforePrevious")} (${prevCommitDate.toISOString()})`,
      };
    }

    // Check 3: Date is not later than next commit
    if (nextCommitDate && isAfter(newDate, nextCommitDate)) {
      return {
        isValid: false,
        error: `${t("validator.afterNext")} (${nextCommitDate.toISOString()})`,
      };
    }

    return { isValid: true };
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    // Remove milliseconds and Z
    // Example: "2025-01-15T14:30:45.123Z" -> "2025-01-15T14:30:45"
    return date.toISOString().replace(/\.\d{3}Z$/, "");
  }

  /**
   * Format date range for display
   */
  formatDateRange(range: DateRange): string {
    const minStr = range.min ? this.formatDate(range.min) : t("validator.noLimit");
    const maxStr = this.formatDate(range.max);

    return `${minStr} — ${maxStr}`;
  }
}

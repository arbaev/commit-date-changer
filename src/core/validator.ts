import { isValid, parseISO, isBefore, isAfter } from 'date-fns';
import { DateRange, ValidationResult } from '../types/index.js';

/**
 * Валидатор дат для коммитов
 */
export class DateValidator {
  /**
   * Валидировать строку даты в ISO формате
   */
  validateISOFormat(dateString: string): ValidationResult {
    try {
      const date = parseISO(dateString);

      if (!isValid(date)) {
        return {
          isValid: false,
          error: 'Невалидная дата. Используйте ISO формат: YYYY-MM-DDTHH:mm',
        };
      }

      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: 'Ошибка парсинга даты. Используйте ISO формат: YYYY-MM-DDTHH:mm',
      };
    }
  }

  /**
   * Парсить дату из ISO строки
   * Парсим как UTC, добавляя 'Z' к строке если его нет
   */
  parseDate(dateString: string): Date | null {
    try {
      // Если строка не содержит timezone (Z или +HH:MM), добавляем Z для UTC
      let dateStr = dateString;
      if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
        dateStr = dateString + 'Z';
      }
      const date = parseISO(dateStr);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  }

  /**
   * Получить допустимый диапазон дат для коммита
   */
  getValidDateRange(
    prevCommitDate: Date | null,
    nextCommitDate: Date | null
  ): DateRange {
    const now = new Date();

    // Максимум = минимум из (текущее время, дата следующего коммита)
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
   * Валидировать новую дату относительно соседних коммитов
   */
  validateDate(
    newDate: Date,
    prevCommitDate: Date | null,
    nextCommitDate: Date | null
  ): ValidationResult {
    const now = new Date();

    // Проверка 1: Дата не в будущем
    if (isAfter(newDate, now)) {
      return {
        isValid: false,
        error: 'Дата не может быть в будущем',
      };
    }

    // Проверка 2: Дата не раньше предыдущего коммита
    if (prevCommitDate && isBefore(newDate, prevCommitDate)) {
      return {
        isValid: false,
        error: `Дата не может быть раньше предыдущего коммита (${prevCommitDate.toISOString()})`,
      };
    }

    // Проверка 3: Дата не позже следующего коммита
    if (nextCommitDate && isAfter(newDate, nextCommitDate)) {
      return {
        isValid: false,
        error: `Дата не может быть позже следующего коммита (${nextCommitDate.toISOString()})`,
      };
    }

    return { isValid: true };
  }

  /**
   * Форматировать дату для отображения
   */
  formatDate(date: Date): string {
    return date.toISOString().replace('.000Z', '').replace('Z', '');
  }

  /**
   * Форматировать диапазон дат для отображения
   */
  formatDateRange(range: DateRange): string {
    const minStr = range.min
      ? this.formatDate(range.min)
      : 'без ограничений';
    const maxStr = this.formatDate(range.max);

    return `${minStr} — ${maxStr}`;
  }
}

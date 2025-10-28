/**
 * Интерфейс для Git коммита
 */
export interface Commit {
  hash: string; // Короткий hash коммита (7 символов)
  fullHash: string; // Полный hash
  message: string; // Сообщение коммита
  authorDate: Date; // Дата автора (будем менять обе даты одновременно)
  committerDate: Date; // Дата коммиттера (будем менять обе даты одновременно)
  author: string; // Имя автора
  isPushed: boolean; // Запушен ли коммит
  remotes: string[]; // Список remote веток, содержащих коммит
}

/**
 * Допустимый диапазон дат для изменения
 */
export interface DateRange {
  min: Date | null; // Минимально допустимая дата (null = без ограничений)
  max: Date; // Максимально допустимая дата (текущее время или следующий коммит)
}

/**
 * Результат валидации даты
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Опции CLI команды
 */
export interface CliOptions {
  allowPushed?: boolean; // Разрешить изменение запушенных коммитов
  count?: number; // Количество коммитов для отображения
  all?: boolean; // Алиас для allowPushed
  lang?: string; // Язык интерфейса
  // Режим командной строки
  hash?: string; // Hash коммита для изменения
  date?: string; // Новая дата в ISO 8601 формате
  noConfirm?: boolean; // Пропустить все подтверждения
  json?: boolean; // Вывод в JSON формате
}

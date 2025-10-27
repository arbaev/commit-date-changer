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
 * Группировка коммитов по статусу push
 */
export interface CommitGroups {
  unpushed: Commit[];
  pushed: Commit[];
}

/**
 * Опции CLI команды
 */
export interface CliOptions {
  allowPushed?: boolean; // Разрешить изменение запушенных коммитов
  count?: number; // Количество коммитов для отображения
  branch?: string; // Конкретная ветка
  hash?: string; // Конкретный hash коммита (неинтерактивный режим)
  date?: string; // Новая дата (неинтерактивный режим)
  force?: boolean; // Пропустить подтверждения (неинтерактивный режим)
}

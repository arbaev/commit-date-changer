import { GitService } from './git.js';
import { DateValidator } from './validator.js';
import { Commit } from '../types/index.js';

/**
 * Сервис для изменения дат коммитов
 */
export class DateChanger {
  constructor(
    private gitService: GitService,
    private validator: DateValidator
  ) {}

  /**
   * Изменить дату коммита (обе даты: author + committer)
   */
  async changeCommitDate(commit: Commit, newDate: Date): Promise<void> {
    try {
      await this.gitService.changeCommitDate(commit.fullHash, newDate);
    } catch (error) {
      throw new Error(
        `Ошибка при изменении даты коммита: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      );
    }
  }

  /**
   * Валидировать и изменить дату коммита
   */
  async validateAndChange(
    commit: Commit,
    newDate: Date,
    prevCommitDate: Date | null,
    nextCommitDate: Date | null
  ): Promise<void> {
    // Валидация даты
    const validation = this.validator.validateDate(
      newDate,
      prevCommitDate,
      nextCommitDate
    );

    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Изменение даты
    await this.changeCommitDate(commit, newDate);
  }
}

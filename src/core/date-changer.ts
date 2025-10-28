import { GitService } from './git.js';
import { DateValidator } from './validator.js';
import { Commit } from '../types/index.js';

/**
 * Service for changing commit dates
 */
export class DateChanger {
  constructor(
    private gitService: GitService,
    private validator: DateValidator
  ) {}

  /**
   * Change commit date (both dates: author + committer)
   */
  async changeCommitDate(commit: Commit, newDate: Date): Promise<void> {
    try {
      await this.gitService.changeCommitDate(commit.fullHash, newDate);
    } catch (error) {
      throw new Error(
        `Error changing commit date: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate and change commit date
   */
  async validateAndChange(
    commit: Commit,
    newDate: Date,
    prevCommitDate: Date | null,
    nextCommitDate: Date | null
  ): Promise<void> {
    // Validate date
    const validation = this.validator.validateDate(
      newDate,
      prevCommitDate,
      nextCommitDate
    );

    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Change date
    await this.changeCommitDate(commit, newDate);
  }
}

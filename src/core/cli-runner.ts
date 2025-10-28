import { GitService } from "./git.js";
import { DateValidator } from "./validator.js";
import { DateChanger } from "./date-changer.js";
import { Commit } from "../types/index.js";
import { t } from "../i18n.js";

/**
 * Options for CLI mode
 */
export interface CliModeOptions {
  hash: string;
  date: string;
  noConfirm: boolean;
  json: boolean;
  allowPushed: boolean;
}

/**
 * Result of CLI mode operation
 */
export interface CliModeResult {
  success: boolean;
  commit?: {
    hash: string;
    message: string;
    oldDate: string;
    newDate: string;
    isPushed: boolean;
  };
  error?: string;
  errorCode?: string;
}

/**
 * Service for executing operations in CLI mode
 */
export class CliRunner {
  constructor(
    private gitService: GitService,
    private validator: DateValidator,
    private dateChanger: DateChanger,
  ) {}

  /**
   * Find commit by hash
   */
  async findCommitByHash(hash: string, allowPushed: boolean): Promise<Commit | null> {
    const commits = allowPushed
      ? await this.gitService.getAllCommits(100)
      : await this.gitService.getUnpushedCommits(100);

    return (
      commits.find((c) => c.hash === hash || c.fullHash === hash || c.fullHash.startsWith(hash)) ||
      null
    );
  }

  /**
   * Validate input parameters
   */
  validateInputs(options: CliModeOptions): CliModeResult | null {
    // Check date format
    const formatValidation = this.validator.validateISOFormat(options.date);
    if (!formatValidation.isValid) {
      return {
        success: false,
        error: formatValidation.error || t("validator.invalidDate"),
        errorCode: "INVALID_DATE_FORMAT",
      };
    }

    return null; // All OK
  }

  /**
   * Execute date change
   */
  async execute(options: CliModeOptions): Promise<CliModeResult> {
    try {
      // Validate input data
      const validationError = this.validateInputs(options);
      if (validationError) {
        return validationError;
      }

      // Find commit
      const commit = await this.findCommitByHash(options.hash, options.allowPushed);
      if (!commit) {
        return {
          success: false,
          error: t("errors.commitNotFound", { hash: options.hash }),
          errorCode: "COMMIT_NOT_FOUND",
        };
      }

      // Check pushed status
      if (commit.isPushed && !options.noConfirm) {
        return {
          success: false,
          error: t("errors.pushedNoConfirm", {
            hash: commit.hash,
            remotes: commit.remotes.join(", "),
          }),
          errorCode: "PUSHED_REQUIRES_CONFIRM",
        };
      }

      // Parse new date
      const newDate = this.validator.parseDate(options.date);
      if (!newDate) {
        return {
          success: false,
          error: t("validator.parsingError"),
          errorCode: "DATE_PARSING_ERROR",
        };
      }

      // Determine valid range
      const allCommits = options.allowPushed
        ? await this.gitService.getAllCommits(100)
        : await this.gitService.getUnpushedCommits(100);

      const commitIndex = allCommits.findIndex((c) => c.hash === commit.hash);
      const prevCommit = commitIndex < allCommits.length - 1 ? allCommits[commitIndex + 1] : null;
      const nextCommit = commitIndex > 0 ? allCommits[commitIndex - 1] : null;

      const prevDate = prevCommit ? prevCommit.authorDate : null;
      const nextDate = nextCommit ? nextCommit.authorDate : null;

      // Validate date range
      const rangeValidation = this.validator.validateDate(newDate, prevDate, nextDate);
      if (!rangeValidation.isValid) {
        return {
          success: false,
          error: rangeValidation.error || t("validator.outOfRange"),
          errorCode: "DATE_OUT_OF_RANGE",
        };
      }

      // Apply changes
      await this.dateChanger.validateAndChange(commit, newDate, prevDate, nextDate);

      // Success
      return {
        success: true,
        commit: {
          hash: commit.hash,
          message: commit.message,
          oldDate: commit.authorDate.toISOString(),
          newDate: newDate.toISOString(),
          isPushed: commit.isPushed,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("errors.unknownError"),
        errorCode: "EXECUTION_ERROR",
      };
    }
  }

  /**
   * Format output
   */
  formatOutput(result: CliModeResult, asJson: boolean): string {
    if (asJson) {
      return JSON.stringify(result, null, 2);
    }

    if (!result.success) {
      return `Error: ${result.error}`;
    }

    const commit = result.commit!;
    return `Success: Changed date for commit ${commit.hash} from ${commit.oldDate} to ${commit.newDate}`;
  }
}

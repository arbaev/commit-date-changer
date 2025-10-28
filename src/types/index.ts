/**
 * Interface for Git commit
 */
export interface Commit {
  hash: string; // Short commit hash (7 characters)
  fullHash: string; // Full hash
  message: string; // Commit message
  authorDate: Date; // Author date (we change both dates simultaneously)
  committerDate: Date; // Committer date (we change both dates simultaneously)
  author: string; // Author name
  isPushed: boolean; // Whether the commit is pushed
  remotes: string[]; // List of remote branches containing the commit
}

/**
 * Valid date range for modification
 */
export interface DateRange {
  min: Date | null; // Minimum allowed date (null = no limit)
  max: Date; // Maximum allowed date (current time or next commit)
}

/**
 * Date validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * CLI command options
 */
export interface CliOptions {
  allowPushed?: boolean; // Allow modification of pushed commits
  count?: number; // Number of commits to display
  all?: boolean; // Alias for allowPushed
  lang?: string; // Interface language
  // CLI mode
  hash?: string; // Commit hash to modify
  date?: string; // New date in ISO 8601 format
  noConfirm?: boolean; // Skip all confirmations
  json?: boolean; // Output in JSON format
}

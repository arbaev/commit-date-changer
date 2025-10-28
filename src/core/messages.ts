import chalk from "chalk";
import { Commit } from "../types/index.js";
import { t } from "../i18n.js";

/**
 * Service for formatting messages and warnings
 */
export class MessageFormatter {
  /**
   * Check if pushed commits mode is required
   */
  requiresPushedMode(commit: Commit): boolean {
    return commit.isPushed;
  }

  /**
   * Get warning text when running with --allow-pushed
   */
  getInitialWarning(): string {
    return `
${chalk.yellow(t("messages.warningTitle"))} ${t("messages.pushedModeTitle")}

${t("messages.pushedChangeWarning")}
${t("messages.rewritesHistory")}
${t("messages.requiresForce")}
${t("messages.breakOthers")}
${t("messages.causesConflicts")}

${t("messages.useOnlyIf")}
${chalk.green("✓")} ${t("messages.personalBranch")}
${chalk.green("✓")} ${t("messages.noOthers")}
${chalk.green("✓")} ${t("messages.understandForce")}
`;
  }

  /**
   * Get warning when selecting pushed commit
   */
  getCommitWarning(commit: Commit): string {
    const remotesStr = commit.remotes.join(", ");

    return `
${chalk.red(t("messages.dangerTitle"))} ${t("messages.commitAlreadyPushed")}

${t("messages.commit")} ${chalk.cyan(commit.hash)} "${commit.message}"
${t("messages.pushedTo")} ${chalk.yellow(remotesStr)}

${t("messages.modificationRequires")}
${chalk.yellow("•")} ${t("messages.forcePushCommand")}
`;
  }

  /**
   * Get final warning before applying changes
   */
  getFinalWarning(commit: Commit): string {
    return `
${chalk.yellow(t("messages.afterChange"))}
   ${t("messages.forcePushCommand")} ${commit.remotes[0] || "origin <branch>"}
`;
  }

  /**
   * Show instructions after successful change of pushed commit
   */
  showPostChangeInstructions(commit: Commit): string {
    const remote = commit.remotes[0] || "origin <branch>";

    return `
${chalk.yellow(t("messages.important"))} ${t("messages.commitWasPushed")}

   ${chalk.cyan(`${t("messages.forcePushCommand")} ${remote}`)}

${chalk.yellow(t("messages.warnTeam"))}
`;
  }

  /**
   * Get force push command
   */
  getForcePushCommand(commit: Commit): string {
    const remote = commit.remotes[0] || "origin";
    return `${t("messages.forcePushCommand")} ${remote}`;
  }

  /**
   * Format commit name with marker (for pushed commits)
   */
  formatCommitName(commit: Commit): string {
    const marker = commit.isPushed ? chalk.yellow("⚠️  ") : "";
    const hash = chalk.gray(commit.hash);
    const date = commit.authorDate.toISOString().substring(0, 16).replace("T", " ");

    return `${marker}${hash} [${date}] ${commit.message}`;
  }
}

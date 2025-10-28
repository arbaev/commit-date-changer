import chalk from "chalk";
import { Commit } from "../types/index.js";
import { t } from "../i18n.js";

/**
 * Сервис для форматирования сообщений и предупреждений
 */
export class MessageFormatter {
  /**
   * Проверить, требуется ли режим с запушенными коммитами
   */
  requiresPushedMode(commit: Commit): boolean {
    return commit.isPushed;
  }

  /**
   * Получить текст предупреждения при запуске с --allow-pushed
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
   * Получить предупреждение при выборе запушенного коммита
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
   * Получить финальное предупреждение перед применением
   */
  getFinalWarning(commit: Commit): string {
    return `
${chalk.yellow(t("messages.afterChange"))}
   ${t("messages.forcePushCommand")} ${commit.remotes[0] || "origin <branch>"}
`;
  }

  /**
   * Показать инструкции после успешного изменения запушенного коммита
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
   * Получить команду для force push
   */
  getForcePushCommand(commit: Commit): string {
    const remote = commit.remotes[0] || "origin";
    return `${t("messages.forcePushCommand")} ${remote}`;
  }

  /**
   * Форматировать имя коммита с маркером (для запушенных)
   */
  formatCommitName(commit: Commit): string {
    const marker = commit.isPushed ? chalk.yellow("⚠️  ") : "";
    const hash = chalk.gray(commit.hash);
    const date = commit.authorDate.toISOString().substring(0, 16).replace("T", " ");

    return `${marker}${hash} [${date}] ${commit.message}`;
  }
}

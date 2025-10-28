#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { GitService } from "./core/git.js";
import { DateValidator } from "./core/validator.js";
import { DateChanger } from "./core/date-changer.js";
import { MessageFormatter } from "./core/messages.js";
import { UIPrompts } from "./ui/prompts.js";
import { CliRunner } from "./core/cli-runner.js";
import { Commit } from "./types/index.js";
import { initI18n, t } from "./i18n.js";

// Получение версии из package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

const program = new Command();

program
  .name("commit-date")
  .description("Interactive CLI tool to safely change Git commit dates")
  .version(packageJson.version)
  .option("-l, --lang <language>", "Language: en (English) or ru (Русский)")
  .option("--allow-pushed", "Allow modification of pushed commits")
  .option("--all", "Alias for --allow-pushed")
  .option("--count <number>", "Number of commits to display", "10")
  // Режим командной строки
  .option("--hash <hash>", "Commit hash to change (CLI mode)")
  .option("-d, --date <date>", "New date in ISO 8601 format (CLI mode)")
  .option("--no-confirm", "Skip all confirmations (USE WITH CAUTION)")
  .option("--json", "Output result in JSON format")
  .parse(process.argv);

const options = program.opts();

/**
 * Основная функция CLI
 */
async function main() {
  try {
    // Инициализация i18n
    await initI18n(options.lang);

    // Инициализация сервисов
    const gitService = new GitService();
    const validator = new DateValidator();
    const dateChanger = new DateChanger(gitService, validator);
    const messageFormatter = new MessageFormatter();
    const ui = new UIPrompts(messageFormatter, validator);

    // Проверка Git репозитория
    const isGitRepo = await gitService.isGitRepository();
    if (!isGitRepo) {
      ui.showError(t("cli.notGitRepo"));
      process.exit(1);
    }

    // Проверка uncommitted изменений
    const hasUncommitted = await gitService.hasUncommittedChanges();
    if (hasUncommitted) {
      if (options.json) {
        console.log(
          JSON.stringify({
            success: false,
            error: t("cli.uncommittedChanges"),
            errorCode: "UNCOMMITTED_CHANGES",
          }),
        );
        process.exit(1);
      }
      ui.showError(t("cli.uncommittedChanges"));
      process.exit(1);
    }

    // РЕЖИМ КОМАНДНОЙ СТРОКИ
    if (options.hash && options.date) {
      const runner = new CliRunner(gitService, validator, dateChanger);
      const result = await runner.execute({
        hash: options.hash,
        date: options.date,
        noConfirm: options.confirm === false, // commander преобразует --no-confirm в confirm: false
        json: options.json || false,
        allowPushed: options.allowPushed || options.all || false,
      });

      const output = runner.formatOutput(result, options.json || false);
      console.log(output);
      process.exit(result.success ? 0 : 1);
    }

    // Проверка: если указан только один из флагов - ошибка
    if (options.hash || options.date) {
      const error = "Both --hash and --date are required for CLI mode";
      if (options.json) {
        console.log(
          JSON.stringify({
            success: false,
            error,
            errorCode: "MISSING_REQUIRED_OPTIONS",
          }),
        );
      } else {
        console.error(`Error: ${error}`);
      }
      process.exit(1);
    }

    // Режим с запушенными коммитами
    const allowPushed = options.allowPushed || options.all;

    if (allowPushed) {
      const confirmed = await ui.confirmPushedMode();
      if (!confirmed) {
        console.log(chalk.gray(t("cli.operationCancelled")));
        process.exit(0);
      }
    }

    // Получение коммитов
    const count = parseInt(options.count, 10);
    let commits: Commit[];

    if (allowPushed) {
      commits = await gitService.getAllCommits(count);
    } else {
      commits = await gitService.getUnpushedCommits(count);

      if (commits.length === 0) {
        console.log(chalk.yellow(t("cli.noUnpushedCommits")));
        console.log("");
        console.log(chalk.gray(t("cli.useAllowPushed")));
        process.exit(0);
      }
    }

    // Интерактивный цикл
    let shouldContinue = true;

    while (shouldContinue) {
      try {
        // Шаг 1: Выбор коммита
        const selectedCommit = await ui.selectCommit(commits, allowPushed);

        console.log("");
        console.log(chalk.green(t("cli.selectedCommit")), chalk.cyan(selectedCommit.hash));

        // Шаг 2: Определение допустимого диапазона дат
        const commitIndex = commits.findIndex((c) => c.hash === selectedCommit.hash);
        const prevCommit = commitIndex < commits.length - 1 ? commits[commitIndex + 1] : null;
        const nextCommit = commitIndex > 0 ? commits[commitIndex - 1] : null;

        const prevDate = prevCommit ? prevCommit.authorDate : null;
        const nextDate = nextCommit ? nextCommit.authorDate : null;

        const validRange = validator.getValidDateRange(prevDate, nextDate);

        // Шаг 3: Ввод новой даты
        const newDate = await ui.promptNewDate(selectedCommit.authorDate, validRange);

        // Проверка: если дата не изменилась (сравниваем до минут, игнорируя секунды)
        const oldDateStr = selectedCommit.authorDate.toISOString().substring(0, 16);
        const newDateStr = newDate.toISOString().substring(0, 16);

        if (newDateStr === oldDateStr) {
          console.log("");
          console.log(chalk.yellow(t("cli.dateUnchanged")));
          console.log("");
        } else {
          console.log(chalk.green(t("cli.newDate")), validator.formatDate(newDate));

          // Шаг 4: Подтверждение изменений
          const confirmed = await ui.confirmChanges(selectedCommit, newDate);

          if (!confirmed) {
            console.log(chalk.gray(t("cli.changeCancelled")));
            console.log("");
          } else {
            // Шаг 5: Применение изменений
            await dateChanger.validateAndChange(selectedCommit, newDate, prevDate, nextDate);

            ui.showSuccess(selectedCommit);
          }
        }

        // Шаг 6: Спросить о продолжении
        shouldContinue = await ui.askContinue();

        if (shouldContinue) {
          // Обновить список коммитов
          if (allowPushed) {
            commits = await gitService.getAllCommits(count);
          } else {
            commits = await gitService.getUnpushedCommits(count);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === t("errors.userCancelled")) {
            console.log(chalk.gray(t("cli.operationCancelled")));
            console.log("");
            shouldContinue = await ui.askContinue();
          } else {
            ui.showError(error.message);
            shouldContinue = false;
          }
        } else {
          ui.showError(t("errors.unknownError"));
          shouldContinue = false;
        }
      }
    }

    ui.showGoodbye();
  } catch (error) {
    console.error("");
    console.error(chalk.red(t("errors.criticalError")));
    console.error(error instanceof Error ? error.message : t("errors.unknownError"));
    console.error("");
    process.exit(1);
  }
}

// Запуск
main().catch((error) => {
  console.error(t("errors.unhandledError"), error);
  process.exit(1);
});

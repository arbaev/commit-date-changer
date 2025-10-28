import inquirer from "inquirer";
import input from "@inquirer/input";
import chalk from "chalk";
import { Commit, DateRange } from "../types/index.js";
import { MessageFormatter } from "../core/messages.js";
import { DateValidator } from "../core/validator.js";
import { t } from "../i18n.js";

/**
 * UI сервис для интерактивных промптов
 */
export class UIPrompts {
  constructor(
    private messageFormatter: MessageFormatter,
    private validator: DateValidator,
  ) {}

  /**
   * Показать начальное предупреждение для режима --allow-pushed
   */
  async confirmPushedMode(): Promise<boolean> {
    console.log(this.messageFormatter.getInitialWarning());

    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "confirm",
        message: t("prompts.confirmQuestion"),
        default: "no",
      },
    ]);

    return answer.confirm.toLowerCase() === "yes";
  }

  /**
   * Отобразить список коммитов и дать выбрать
   */
  async selectCommit(commits: Commit[], allowPushed: boolean): Promise<Commit> {
    if (commits.length === 0) {
      throw new Error(t("errors.noCommits"));
    }

    // Группировка коммитов
    const unpushed = commits.filter((c) => !c.isPushed);
    const pushed = commits.filter((c) => c.isPushed);

    // Формирование заголовка
    let header = "";
    if (allowPushed && pushed.length > 0) {
      header = `
${chalk.green(t("prompts.unpushedSafe"))} ${t("prompts.safeToModify")} ${chalk.green("═══")}
`;
      if (unpushed.length === 0) {
        header += chalk.gray(t("prompts.noUnpushedCommits") + "\n");
      }
    }

    console.log(chalk.yellow(t("common.found")), commits.length);
    console.log(header);

    // Формирование choices
    type ChoiceItem = { name: string; value: Commit; short: string } | inquirer.Separator;

    const choices: ChoiceItem[] = commits.map((commit, index) => ({
      name: `${index + 1}. ${this.messageFormatter.formatCommitName(commit)}`,
      value: commit,
      short: commit.hash,
    }));

    // Разделитель между незапушенными и запушенными
    if (allowPushed && pushed.length > 0 && unpushed.length > 0) {
      const unpushedCount = unpushed.length;
      choices.splice(unpushedCount, 0, new inquirer.Separator());
      choices.splice(
        unpushedCount + 1,
        0,
        new inquirer.Separator(
          chalk.red(t("prompts.pushedDangerous")) +
            " " +
            chalk.yellow(t("prompts.dangerousToModify")) +
            " " +
            chalk.red("═══"),
        ),
      );
    }

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "commit",
        message: t("prompts.selectCommit"),
        choices,
        pageSize: 15,
      },
    ]);

    const selectedCommit = answer.commit;

    // Если выбран запушенный коммит, показать предупреждение
    if (selectedCommit.isPushed) {
      const confirmed = await this.confirmPushedCommit(selectedCommit);
      if (!confirmed) {
        throw new Error(t("errors.userCancelled"));
      }
    }

    return selectedCommit;
  }

  /**
   * Подтверждение изменения запушенного коммита
   */
  async confirmPushedCommit(commit: Commit): Promise<boolean> {
    console.log(this.messageFormatter.getCommitWarning(commit));

    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "confirm",
        message: t("prompts.confirmPushed"),
        default: "no",
      },
    ]);

    return answer.confirm.toLowerCase() === "yes";
  }

  /**
   * Запросить новую дату в ISO формате
   */
  async promptNewDate(currentDate: Date, validRange: DateRange): Promise<Date> {
    const formattedCurrent = this.validator.formatDate(currentDate);
    const formattedRange = this.validator.formatDateRange(validRange);

    console.log("");
    console.log(chalk.yellow(t("prompts.currentDate")), formattedCurrent);
    console.log(chalk.green(t("prompts.validRange")), formattedRange);
    console.log("");

    // Форматируем текущую дату для предзаполнения (без секунд)
    const initialDate = currentDate.toISOString().substring(0, 16);

    const answer = await input({
      message: t("prompts.enterDate"),
      default: initialDate,
      validate: (value: string) => {
        // Если пользователь оставил текущее значение без изменений
        if (!value || value.trim() === "") {
          return true; // Валидация прошла
        }

        // Валидация формата
        const formatValidation = this.validator.validateISOFormat(value);
        if (!formatValidation.isValid) {
          return formatValidation.error || t("validator.invalidDateShort");
        }

        // Парсинг и валидация диапазона
        const parsedDate = this.validator.parseDate(value);
        if (!parsedDate) {
          return t("validator.parsingError");
        }

        const rangeValidation = this.validator.validateDate(
          parsedDate,
          validRange.min,
          validRange.max,
        );

        if (!rangeValidation.isValid) {
          return rangeValidation.error || t("validator.outOfRange");
        }

        return true;
      },
    });

    // Если пользователь оставил поле пустым, используем текущую дату
    if (!answer || answer.trim() === "") {
      return currentDate;
    }

    const newDate = this.validator.parseDate(answer);
    if (!newDate) {
      throw new Error(t("validator.parsingError"));
    }

    return newDate;
  }

  /**
   * Показать превью изменений и запросить подтверждение
   */
  async confirmChanges(commit: Commit, newDate: Date): Promise<boolean> {
    const formattedOld = this.validator.formatDate(commit.authorDate);
    const formattedNew = this.validator.formatDate(newDate);

    console.log("");
    console.log(chalk.yellow(t("preview.title")));
    console.log(t("preview.commit"), chalk.cyan(commit.hash), `"${commit.message}"`);

    if (commit.isPushed) {
      console.log(
        t("preview.status"),
        chalk.yellow(t("preview.pushedStatus")),
        chalk.gray(`${t("preview.pushedIn")} ${commit.remotes.join(", ")}`),
      );
    }

    console.log(t("preview.oldDate"), formattedOld);
    console.log(t("preview.newDate"), chalk.green(formattedNew));
    console.log(t("preview.willChange"), chalk.gray(t("preview.authorAndCommitter")));

    if (commit.isPushed) {
      console.log(this.messageFormatter.getFinalWarning(commit));
    }

    console.log("");

    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "confirm",
        message: commit.isPushed ? t("prompts.lastWarning") : t("prompts.confirmChanges"),
        default: commit.isPushed ? "no" : "y",
      },
    ]);

    const confirmed = commit.isPushed
      ? answer.confirm.toLowerCase() === "yes"
      : answer.confirm.toLowerCase() !== "n" && answer.confirm.toLowerCase() !== "no";

    return confirmed;
  }

  /**
   * Спросить, продолжить работу или выйти
   */
  async askContinue(): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "continue",
        message: t("prompts.continueWork"),
        default: false,
      },
    ]);

    return answer.continue;
  }

  /**
   * Показать сообщение об успехе
   */
  showSuccess(commit: Commit): void {
    console.log("");
    console.log(chalk.green(t("success.dateChanged")));

    if (commit.isPushed) {
      console.log(this.messageFormatter.showPostChangeInstructions(commit));
    }

    console.log("");
  }

  /**
   * Показать сообщение об ошибке
   */
  showError(message: string): void {
    console.error("");
    console.error(chalk.red(t("errors.error")), message);
    console.error("");
  }

  /**
   * Показать прощание
   */
  showGoodbye(): void {
    console.log(chalk.yellow(t("cli.goodbye")));
  }
}

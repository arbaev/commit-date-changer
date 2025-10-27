import inquirer from "inquirer";
import { text, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { Commit, DateRange } from "../types/index.js";
import { SafetyService } from "../core/safety.js";
import { DateValidator } from "../core/validator.js";

/**
 * UI сервис для интерактивных промптов
 */
export class UIPrompts {
  constructor(
    private safetyService: SafetyService,
    private validator: DateValidator,
  ) {}

  /**
   * Показать начальное предупреждение для режима --allow-pushed
   */
  async confirmPushedMode(): Promise<boolean> {
    console.log(this.safetyService.getInitialWarning());

    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "confirm",
        message: 'Вы уверены, что хотите продолжить? (введите "yes" для продолжения)',
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
      throw new Error("Нет доступных коммитов для изменения");
    }

    // Группировка коммитов
    const unpushed = commits.filter((c) => !c.isPushed);
    const pushed = commits.filter((c) => c.isPushed);

    // Формирование заголовка
    let header = "";
    if (allowPushed && pushed.length > 0) {
      header = `
${chalk.green("═══ НЕЗАПУШЕННЫЕ")} (безопасно изменять) ${chalk.green("═══")}
`;
      if (unpushed.length === 0) {
        header += chalk.gray("  (нет незапушенных коммитов)\n");
      }
    }

    console.log(chalk.blue("🔍 Найдено коммитов:"), commits.length);
    console.log(header);

    // Формирование choices
    type ChoiceItem = { name: string; value: Commit; short: string } | inquirer.Separator;

    const choices: ChoiceItem[] = commits.map((commit, index) => ({
      name: `${index + 1}. ${this.safetyService.formatCommitName(commit)}`,
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
          chalk.red("═══ ЗАПУШЕННЫЕ") + chalk.yellow(" (⚠️  опасно изменять)") + chalk.red(" ═══"),
        ),
      );
    }

    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "commit",
        message: "Выберите коммит для изменения даты:",
        choices,
        pageSize: 15,
      },
    ]);

    const selectedCommit = answer.commit;

    // Если выбран запушенный коммит, показать предупреждение
    if (selectedCommit.isPushed) {
      const confirmed = await this.confirmPushedCommit(selectedCommit);
      if (!confirmed) {
        throw new Error("Операция отменена пользователем");
      }
    }

    return selectedCommit;
  }

  /**
   * Подтверждение изменения запушенного коммита
   */
  async confirmPushedCommit(commit: Commit): Promise<boolean> {
    console.log(this.safetyService.getCommitWarning(commit));

    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "confirm",
        message: 'Продолжить изменение запушенного коммита? (введите "yes" для продолжения)',
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
    console.log(chalk.blue("📅 Текущая дата:"), formattedCurrent);
    console.log(chalk.gray("   Допустимый диапазон:"), formattedRange);
    console.log("");

    // Форматируем текущую дату для предзаполнения (без секунд)
    const initialDate = currentDate.toISOString().substring(0, 16);

    const answer = await text({
      message: "Введите новую дату и время (ISO формат: YYYY-MM-DDTHH:mm)",
      initialValue: initialDate,
      placeholder: "YYYY-MM-DDTHH:mm",
      validate: (value: string) => {
        // Если пользователь оставил текущее значение без изменений
        if (!value || value.trim() === "") {
          return; // Валидация прошла
        }

        // Валидация формата
        const formatValidation = this.validator.validateISOFormat(value);
        if (!formatValidation.isValid) {
          return formatValidation.error || "Невалидная дата";
        }

        // Парсинг и валидация диапазона
        const parsedDate = this.validator.parseDate(value);
        if (!parsedDate) {
          return "Ошибка парсинга даты";
        }

        const rangeValidation = this.validator.validateDate(
          parsedDate,
          validRange.min,
          validRange.max,
        );

        if (!rangeValidation.isValid) {
          return rangeValidation.error || "Дата вне допустимого диапазона";
        }
      },
    });

    // Если пользователь оставил поле пустым, используем текущую дату
    if (!answer || answer.trim() === "") {
      return currentDate;
    }

    const newDate = this.validator.parseDate(answer as string);
    if (!newDate) {
      throw new Error("Ошибка парсинга даты");
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
    console.log(chalk.blue("📋 Превью изменений:"));
    console.log("   Коммит:      ", chalk.cyan(commit.hash), `"${commit.message}"`);

    if (commit.isPushed) {
      console.log(
        "   Статус:      ",
        chalk.yellow("⚠️  ЗАПУШЕН"),
        chalk.gray(`в ${commit.remotes.join(", ")}`),
      );
    }

    console.log("   Старая дата: ", formattedOld);
    console.log("   Новая дата:  ", chalk.green(formattedNew));
    console.log("   Изменяются:  ", chalk.gray("Author Date + Committer Date"));

    if (commit.isPushed) {
      console.log(this.safetyService.getFinalWarning(commit));
    }

    console.log("");

    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "confirm",
        message: commit.isPushed
          ? 'ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ: Применить изменения? (введите "yes")'
          : "Применить изменения? (Y/n)",
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
        message: "Изменить еще один коммит?",
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
    console.log(chalk.green("✨ Дата коммита успешно изменена!"));

    if (commit.isPushed) {
      console.log(this.safetyService.showPostChangeInstructions(commit));
    }

    console.log("");
  }

  /**
   * Показать сообщение об ошибке
   */
  showError(message: string): void {
    console.error("");
    console.error(chalk.red("❌ Ошибка:"), message);
    console.error("");
  }

  /**
   * Показать прощание
   */
  showGoodbye(): void {
    console.log(chalk.blue("👋 Готово!"));
  }
}

#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { GitService } from './core/git.js';
import { DateValidator } from './core/validator.js';
import { DateChanger } from './core/date-changer.js';
import { SafetyService } from './core/safety.js';
import { UIPrompts } from './ui/prompts.js';
import { Commit } from './types/index.js';

const program = new Command();

program
  .name('commit-date')
  .description('Interactive CLI tool to safely change Git commit dates')
  .version('1.0.0')
  .option('--allow-pushed', 'Разрешить изменение запушенных коммитов')
  .option('--all', 'Алиас для --allow-pushed')
  .option('--count <number>', 'Количество коммитов для отображения', '10')
  .parse(process.argv);

const options = program.opts();

/**
 * Основная функция CLI
 */
async function main() {
  try {
    // Инициализация сервисов
    const gitService = new GitService();
    const validator = new DateValidator();
    const dateChanger = new DateChanger(gitService, validator);
    const safetyService = new SafetyService();
    const ui = new UIPrompts(safetyService, validator);

    // Проверка Git репозитория
    const isGitRepo = await gitService.isGitRepository();
    if (!isGitRepo) {
      ui.showError('Текущая директория не является Git репозиторием');
      process.exit(1);
    }

    // Проверка uncommitted изменений
    const hasUncommitted = await gitService.hasUncommittedChanges();
    if (hasUncommitted) {
      ui.showError(
        'Есть незакоммиченные изменения. Закоммитьте или спрячьте их перед использованием утилиты'
      );
      process.exit(1);
    }

    // Режим с запушенными коммитами
    const allowPushed = options.allowPushed || options.all;

    if (allowPushed) {
      const confirmed = await ui.confirmPushedMode();
      if (!confirmed) {
        console.log(chalk.gray('Операция отменена'));
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
        console.log(chalk.yellow('Нет незапушенных коммитов для изменения'));
        console.log('');
        console.log(
          chalk.gray(
            'Используйте --allow-pushed для работы с запушенными коммитами (опасно!)'
          )
        );
        process.exit(0);
      }
    }

    // Интерактивный цикл
    let shouldContinue = true;

    while (shouldContinue) {
      try {
        // Шаг 1: Выбор коммита
        const selectedCommit = await ui.selectCommit(commits, allowPushed);

        console.log('');
        console.log(chalk.green('✓ Выбран коммит:'), chalk.cyan(selectedCommit.hash));

        // Шаг 2: Определение допустимого диапазона дат
        const commitIndex = commits.findIndex((c) => c.hash === selectedCommit.hash);
        const prevCommit = commitIndex < commits.length - 1 ? commits[commitIndex + 1] : null;
        const nextCommit = commitIndex > 0 ? commits[commitIndex - 1] : null;

        const prevDate = prevCommit ? prevCommit.authorDate : null;
        const nextDate = nextCommit ? nextCommit.authorDate : null;

        const validRange = validator.getValidDateRange(prevDate, nextDate);

        // Шаг 3: Ввод новой даты
        const newDate = await ui.promptNewDate(selectedCommit.authorDate, validRange);

        console.log(chalk.green('✓ Новая дата:'), validator.formatDate(newDate));

        // Шаг 4: Подтверждение изменений
        const confirmed = await ui.confirmChanges(selectedCommit, newDate);

        if (!confirmed) {
          console.log(chalk.gray('Изменение отменено'));
          console.log('');
        } else {
          // Шаг 5: Применение изменений
          await dateChanger.validateAndChange(selectedCommit, newDate, prevDate, nextDate);

          ui.showSuccess(selectedCommit);
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
          if (error.message === 'Операция отменена пользователем') {
            console.log(chalk.gray('Операция отменена'));
            console.log('');
            shouldContinue = await ui.askContinue();
          } else {
            ui.showError(error.message);
            shouldContinue = false;
          }
        } else {
          ui.showError('Неизвестная ошибка');
          shouldContinue = false;
        }
      }
    }

    ui.showGoodbye();
  } catch (error) {
    console.error('');
    console.error(chalk.red('❌ Критическая ошибка:'));
    console.error(error instanceof Error ? error.message : 'Неизвестная ошибка');
    console.error('');
    process.exit(1);
  }
}

// Запуск
main().catch((error) => {
  console.error('Необработанная ошибка:', error);
  process.exit(1);
});

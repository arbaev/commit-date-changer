import chalk from 'chalk';
import { Commit } from '../types/index.js';

/**
 * Сервис безопасности для работы с запушенными коммитами
 */
export class SafetyService {
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
${chalk.yellow('⚠️  ПРЕДУПРЕЖДЕНИЕ:')} Режим изменения запушенных коммитов

Изменение запушенных коммитов:
- Перезаписывает историю Git
- Требует force push
- Может сломать работу других разработчиков
- Может вызвать конфликты при pull

Используйте только если:
${chalk.green('✓')} Вы работаете в personal ветке
${chalk.green('✓')} Никто другой не использует эту ветку
${chalk.green('✓')} Вы понимаете последствия force push
`;
  }

  /**
   * Получить предупреждение при выборе запушенного коммита
   */
  getCommitWarning(commit: Commit): string {
    const remotesStr = commit.remotes.join(', ');

    return `
${chalk.red('⚠️  ОПАСНО:')} Этот коммит УЖЕ ЗАПУШЕН

Коммит: ${chalk.cyan(commit.hash)} "${commit.message}"
Запушен в: ${chalk.yellow(remotesStr)}

Изменение ПОТРЕБУЕТ:
${chalk.yellow('•')} git push --force-with-lease
`;
  }

  /**
   * Получить финальное предупреждение перед применением
   */
  getFinalWarning(commit: Commit): string {
    return `
${chalk.yellow('⚠️  После изменения потребуется:')}
   git push --force-with-lease ${commit.remotes[0] || 'origin <branch>'}
`;
  }

  /**
   * Показать инструкции после успешного изменения запушенного коммита
   */
  showPostChangeInstructions(commit: Commit): string {
    const remote = commit.remotes[0] || 'origin <branch>';

    return `
${chalk.yellow('⚠️  ВАЖНО:')} Коммит был запушен. Для синхронизации выполните:

   ${chalk.cyan(`git push --force-with-lease ${remote}`)}

${chalk.yellow('⚠️  Предупредите команду о force push!')}
`;
  }

  /**
   * Получить команду для force push
   */
  getForcePushCommand(commit: Commit): string {
    const remote = commit.remotes[0] || 'origin';
    return `git push --force-with-lease ${remote}`;
  }

  /**
   * Форматировать имя коммита с маркером (для запушенных)
   */
  formatCommitName(commit: Commit): string {
    const marker = commit.isPushed ? chalk.yellow('⚠️  ') : '';
    const hash = chalk.cyan(commit.hash);
    const date = chalk.gray(commit.authorDate.toISOString().substring(0, 16).replace('T', ' '));

    return `${marker}${hash} (${date}) ${commit.message}`;
  }
}

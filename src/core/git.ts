import simpleGit, { SimpleGit, DefaultLogFields, ListLogLine } from 'simple-git';
import { Commit } from '../types/index.js';

/**
 * Сервис для работы с Git репозиторием
 */
export class GitService {
  private git: SimpleGit;

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Проверить, находимся ли в Git репозитории
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Проверить, есть ли uncommitted изменения
   */
  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status();
    return !status.isClean();
  }

  /**
   * Получить текущую ветку
   */
  async getCurrentBranch(): Promise<string> {
    const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  }

  /**
   * Получить remote tracking branch
   */
  async getRemoteTrackingBranch(): Promise<string | null> {
    try {
      const branch = await this.getCurrentBranch();
      const remoteBranch = await this.git.revparse(['--abbrev-ref', `${branch}@{upstream}`]);
      return remoteBranch.trim();
    } catch {
      return null;
    }
  }

  /**
   * Проверить, запушен ли коммит
   */
  async isCommitPushed(commitHash: string): Promise<boolean> {
    try {
      // Получаем все remote ветки, содержащие этот коммит
      const result = await this.git.raw(['branch', '-r', '--contains', commitHash]);
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Получить список remote веток, содержащих коммит
   */
  async getCommitRemotes(commitHash: string): Promise<string[]> {
    try {
      const result = await this.git.raw(['branch', '-r', '--contains', commitHash]);
      if (!result.trim()) {
        return [];
      }
      return result
        .trim()
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.includes('->'));
    } catch {
      return [];
    }
  }

  /**
   * Получить список незапушенных коммитов
   */
  async getUnpushedCommits(limit: number = 10): Promise<Commit[]> {
    const remoteBranch = await this.getRemoteTrackingBranch();

    let logOptions: string[];
    if (remoteBranch) {
      // Коммиты между remote и HEAD
      logOptions = [`${remoteBranch}..HEAD`, `-n${limit}`];
    } else {
      // Если нет remote, показываем последние коммиты
      logOptions = [`-n${limit}`];
    }

    const log = await this.git.log(logOptions);
    const commits: Commit[] = [];

    for (const entry of log.all) {
      const commit = await this.parseCommit(entry);
      if (!commit.isPushed) {
        commits.push(commit);
      }
    }

    return commits;
  }

  /**
   * Получить все коммиты текущей ветки
   */
  async getAllCommits(limit: number = 20): Promise<Commit[]> {
    const log = await this.git.log([`-n${limit}`]);
    const commits: Commit[] = [];

    for (const entry of log.all) {
      const commit = await this.parseCommit(entry);
      commits.push(commit);
    }

    return commits;
  }

  /**
   * Парсинг коммита из git log
   */
  private async parseCommit(
    entry: DefaultLogFields & ListLogLine
  ): Promise<Commit> {
    const isPushed = await this.isCommitPushed(entry.hash);
    const remotes = isPushed ? await this.getCommitRemotes(entry.hash) : [];

    return {
      hash: entry.hash.substring(0, 7),
      fullHash: entry.hash,
      message: entry.message,
      authorDate: new Date(entry.date),
      committerDate: new Date(entry.date), // simple-git использует author date
      author: entry.author_name,
      isPushed,
      remotes,
    };
  }

  /**
   * Изменить дату коммита через git filter-branch
   * Изменяет ОБЕ даты: author date и committer date
   *
   * ВАЖНО: Это изменяет хеши всех коммитов после измененного!
   */
  async changeCommitDate(commitHash: string, newDate: Date): Promise<void> {
    // Форматируем дату с учетом локального timezone
    // Git ожидает формат: "YYYY-MM-DD HH:MM:SS +ZZZZ"
    const offset = -newDate.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60)
      .toString()
      .padStart(2, '0');
    const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
    const offsetSign = offset >= 0 ? '+' : '-';
    const timezone = `${offsetSign}${offsetHours}${offsetMinutes}`;

    const year = newDate.getFullYear();
    const month = (newDate.getMonth() + 1).toString().padStart(2, '0');
    const day = newDate.getDate().toString().padStart(2, '0');
    const hours = newDate.getHours().toString().padStart(2, '0');
    const minutes = newDate.getMinutes().toString().padStart(2, '0');
    const seconds = newDate.getSeconds().toString().padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${timezone}`;

    // Используем git filter-branch для изменения даты конкретного коммита
    // Это изменит хеш этого коммита и всех последующих
    const script = `
if [ "$GIT_COMMIT" = "${commitHash}" ]; then
  export GIT_AUTHOR_DATE="${formattedDate}"
  export GIT_COMMITTER_DATE="${formattedDate}"
fi
`;

    await this.git.raw([
      'filter-branch',
      '-f',
      '--env-filter',
      script,
      '--',
      '--all',
    ]);

    // Очистка резервных копий
    await this.git.raw(['for-each-ref', '--format=%(refname)', 'refs/original/'])
      .then(async (refs) => {
        if (refs.trim()) {
          const refList = refs.trim().split('\n');
          for (const ref of refList) {
            await this.git.raw(['update-ref', '-d', ref]);
          }
        }
      })
      .catch(() => {
        // Игнорируем ошибки, если нет резервных копий
      });
  }

  /**
   * Получить коммит по hash
   */
  async getCommit(commitHash: string): Promise<Commit | null> {
    try {
      const log = await this.git.log(['-n1', commitHash]);
      if (log.all.length === 0) {
        return null;
      }
      return this.parseCommit(log.all[0]);
    } catch {
      return null;
    }
  }
}

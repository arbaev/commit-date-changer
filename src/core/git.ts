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
   * Изменить дату коммита через git rebase
   * Изменяет ОБЕ даты: author date и committer date
   */
  async changeCommitDate(commitHash: string, newDate: Date): Promise<void> {
    const isoDate = newDate.toISOString();

    // Проверяем, является ли это root коммитом (первым в репозитории)
    let isRootCommit = false;
    try {
      await this.git.revparse([`${commitHash}^`]);
    } catch {
      isRootCommit = true;
    }

    // Если это root коммит, используем другой подход
    if (isRootCommit) {
      // Для root коммита используем filter-branch или прямое изменение через --root
      await this.git.raw([
        'rebase',
        '--root',
        '--committer-date-is-author-date',
        '--exec',
        `GIT_COMMITTER_DATE="${isoDate}" git commit --amend --no-edit --date="${isoDate}"`,
      ]);
    } else {
      // Находим родительский коммит
      const parent = await this.git.revparse([`${commitHash}^`]);

      // Выполняем интерактивный rebase с изменением даты
      await this.git.raw([
        'rebase',
        '--interactive',
        '--autosquash',
        '--autostash',
        parent.trim(),
        '--exec',
        `GIT_COMMITTER_DATE="${isoDate}" git commit --amend --no-edit --date="${isoDate}"`,
      ]);
    }
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

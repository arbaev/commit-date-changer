import simpleGit, { SimpleGit, DefaultLogFields, ListLogLine } from 'simple-git';
import { Commit } from '../types/index.js';

/**
 * Service for working with Git repository
 */
export class GitService {
  private git: SimpleGit;

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Check if we are in a Git repository
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
   * Check if there are uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status();
    return !status.isClean();
  }

  /**
   * Get current branch
   */
  async getCurrentBranch(): Promise<string> {
    const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  }

  /**
   * Get remote tracking branch
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
   * Check if commit is pushed
   */
  async isCommitPushed(commitHash: string): Promise<boolean> {
    try {
      // Get all remote branches containing this commit
      const result = await this.git.raw(['branch', '-r', '--contains', commitHash]);
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get list of remote branches containing commit
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
   * Get list of unpushed commits
   */
  async getUnpushedCommits(limit: number = 10): Promise<Commit[]> {
    const remoteBranch = await this.getRemoteTrackingBranch();

    let logOptions: string[];
    if (remoteBranch) {
      // Commits between remote and HEAD
      logOptions = [`${remoteBranch}..HEAD`, `-n${limit}`];
    } else {
      // If no remote, show latest commits
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
   * Get all commits from current branch
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
   * Parse commit from git log
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
      committerDate: new Date(entry.date), // simple-git uses author date
      author: entry.author_name,
      isPushed,
      remotes,
    };
  }

  /**
   * Change commit date using git filter-branch
   * Changes BOTH dates: author date and committer date
   *
   * IMPORTANT: This changes hashes of all commits after the modified one!
   */
  async changeCommitDate(commitHash: string, newDate: Date): Promise<void> {
    // Format date in ISO format without timezone conversion
    // Use toISOString() which returns UTC time
    const formattedDate = newDate.toISOString();

    // Use git filter-branch to change date of specific commit
    // This will change hash of this commit and all subsequent ones
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

    // Clean up backup refs
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
        // Ignore errors if no backup refs exist
      });
  }

  /**
   * Get commit by hash
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

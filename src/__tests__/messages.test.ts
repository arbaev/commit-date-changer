import { describe, it, expect, beforeEach } from "vitest";
import { MessageFormatter } from "../core/messages.js";
import type { Commit } from "../types/index.js";

describe("MessageFormatter", () => {
  let formatter: MessageFormatter;

  beforeEach(() => {
    formatter = new MessageFormatter();
  });

  const createMockCommit = (overrides?: Partial<Commit>): Commit => ({
    hash: "abc1234",
    fullHash: "abc1234567890abcdef1234567890abcdef123456",
    message: "Test commit",
    authorDate: new Date("2025-01-15T10:00:00Z"),
    committerDate: new Date("2025-01-15T10:00:00Z"),
    author: "Test Author <test@example.com>",
    isPushed: false,
    remotes: [],
    ...overrides,
  });

  describe("requiresPushedMode", () => {
    it("should return false for unpushed commit", () => {
      const commit = createMockCommit({ isPushed: false });
      expect(formatter.requiresPushedMode(commit)).toBe(false);
    });

    it("should return true for pushed commit", () => {
      const commit = createMockCommit({ isPushed: true });
      expect(formatter.requiresPushedMode(commit)).toBe(true);
    });
  });

  describe("getInitialWarning", () => {
    it("should return warning message", () => {
      const warning = formatter.getInitialWarning();

      expect(warning).toContain("WARNING");
      expect(warning).toContain("Pushed commits modification mode");
      expect(warning).toBeTruthy();
      expect(warning.length).toBeGreaterThan(50);
    });

    it("should contain key safety information", () => {
      const warning = formatter.getInitialWarning();

      expect(warning).toContain("personal branch");
      expect(warning).toContain("force push");
    });
  });

  describe("getCommitWarning", () => {
    it("should return warning for pushed commit", () => {
      const commit = createMockCommit({
        isPushed: true,
        remotes: ["origin/main"],
        hash: "abc1234",
        message: "Important fix",
      });

      const warning = formatter.getCommitWarning(commit);

      expect(warning).toContain("DANGER");
      expect(warning).toContain("ALREADY PUSHED");
      expect(warning).toContain("abc1234");
      expect(warning).toContain("Important fix");
      expect(warning).toContain("origin/main");
    });

    it("should list all remotes", () => {
      const commit = createMockCommit({
        isPushed: true,
        remotes: ["origin/main", "upstream/main"],
      });

      const warning = formatter.getCommitWarning(commit);

      expect(warning).toContain("origin/main");
      expect(warning).toContain("upstream/main");
    });

    it("should mention force push requirement", () => {
      const commit = createMockCommit({
        isPushed: true,
        remotes: ["origin/main"],
      });

      const warning = formatter.getCommitWarning(commit);

      expect(warning).toContain("force-with-lease");
    });
  });

  describe("getFinalWarning", () => {
    it("should return final warning message", () => {
      const commit = createMockCommit({
        isPushed: true,
        remotes: ["origin/main"],
      });

      const warning = formatter.getFinalWarning(commit);

      expect(warning).toContain("After modification");
      expect(warning).toContain("force-with-lease");
      expect(warning).toContain("origin/main");
    });

    it("should use default remote when no remotes provided", () => {
      const commit = createMockCommit({
        isPushed: true,
        remotes: [],
      });

      const warning = formatter.getFinalWarning(commit);

      expect(warning).toContain("origin <branch>");
    });
  });

  describe("showPostChangeInstructions", () => {
    it("should return post-change instructions", () => {
      const commit = createMockCommit({
        isPushed: true,
        remotes: ["origin/feature"],
      });

      const instructions = formatter.showPostChangeInstructions(commit);

      expect(instructions).toContain("IMPORTANT");
      expect(instructions).toContain("pushed");
      expect(instructions).toContain("force-with-lease");
      expect(instructions).toContain("origin/feature");
      expect(instructions).toContain("team");
    });

    it("should use default remote when empty", () => {
      const commit = createMockCommit({
        isPushed: true,
        remotes: [],
      });

      const instructions = formatter.showPostChangeInstructions(commit);

      expect(instructions).toContain("origin <branch>");
    });
  });

  describe("getForcePushCommand", () => {
    it("should return force push command with remote", () => {
      const commit = createMockCommit({
        remotes: ["origin/main"],
      });

      const command = formatter.getForcePushCommand(commit);

      expect(command).toContain("git push --force-with-lease");
      expect(command).toContain("origin");
    });

    it("should use default remote when no remotes", () => {
      const commit = createMockCommit({
        remotes: [],
      });

      const command = formatter.getForcePushCommand(commit);

      expect(command).toContain("origin");
    });

    it("should extract remote name from remote/branch", () => {
      const commit = createMockCommit({
        remotes: ["upstream/feature"],
      });

      const command = formatter.getForcePushCommand(commit);

      expect(command).toContain("upstream");
    });
  });

  describe("formatCommitName", () => {
    it("should format unpushed commit without marker", () => {
      const commit = createMockCommit({
        hash: "abc1234",
        message: "Test commit",
        authorDate: new Date("2025-01-15T14:30:00Z"),
        isPushed: false,
      });

      const formatted = formatter.formatCommitName(commit);

      expect(formatted).toContain("abc1234");
      expect(formatted).toContain("Test commit");
      expect(formatted).toContain("2025-01-15");
      expect(formatted).toContain("14:30");
      expect(formatted).not.toContain("⚠️");
    });

    it("should format pushed commit with warning marker", () => {
      const commit = createMockCommit({
        hash: "def5678",
        message: "Pushed commit",
        authorDate: new Date("2025-01-15T10:00:00Z"),
        isPushed: true,
      });

      const formatted = formatter.formatCommitName(commit);

      expect(formatted).toContain("⚠️");
      expect(formatted).toContain("def5678");
      expect(formatted).toContain("Pushed commit");
    });

    it("should format date correctly", () => {
      const commit = createMockCommit({
        authorDate: new Date("2025-12-31T23:59:00Z"),
      });

      const formatted = formatter.formatCommitName(commit);

      expect(formatted).toContain("[2025-12-31 23:59]");
    });

    it("should include full commit message", () => {
      const longMessage = "This is a very long commit message that should be included in full";
      const commit = createMockCommit({
        message: longMessage,
      });

      const formatted = formatter.formatCommitName(commit);

      expect(formatted).toContain(longMessage);
    });
  });
});

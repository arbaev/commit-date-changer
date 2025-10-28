import { describe, it, expect, beforeEach, vi } from "vitest";
import { DateChanger } from "../core/date-changer.js";
import { DateValidator } from "../core/validator.js";
import type { GitService } from "../core/git.js";
import type { Commit } from "../types/index.js";

describe("DateChanger", () => {
  let dateChanger: DateChanger;
  let mockGitService: GitService;
  let validator: DateValidator;

  beforeEach(() => {
    // Create mock GitService
    mockGitService = {
      changeCommitDate: vi.fn().mockResolvedValue(undefined),
      isGitRepository: vi.fn().mockResolvedValue(true),
      hasUncommittedChanges: vi.fn().mockResolvedValue(false),
      getUnpushedCommits: vi.fn(),
      getAllCommits: vi.fn(),
    } as unknown as GitService;

    validator = new DateValidator();
    dateChanger = new DateChanger(mockGitService, validator);
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

  describe("validateAndChange", () => {
    it("should successfully change commit date when validation passes", async () => {
      const commit = createMockCommit();
      const newDate = new Date("2025-01-15T11:00:00Z");

      await dateChanger.validateAndChange(commit, newDate, null, null);

      expect(mockGitService.changeCommitDate).toHaveBeenCalledWith(commit.fullHash, newDate);
    });

    it("should throw error when date is in the future", async () => {
      const commit = createMockCommit();
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // Tomorrow

      await expect(dateChanger.validateAndChange(commit, futureDate, null, null)).rejects.toThrow();

      expect(mockGitService.changeCommitDate).not.toHaveBeenCalled();
    });

    it("should throw error when date is before previous commit", async () => {
      const commit = createMockCommit();
      const prevDate = new Date("2025-01-15T10:00:00Z");
      const newDate = new Date("2025-01-15T09:00:00Z");

      await expect(
        dateChanger.validateAndChange(commit, newDate, prevDate, null),
      ).rejects.toThrow();

      expect(mockGitService.changeCommitDate).not.toHaveBeenCalled();
    });

    it("should throw error when date is after next commit", async () => {
      const commit = createMockCommit();
      const nextDate = new Date("2025-01-15T12:00:00Z");
      const newDate = new Date("2025-01-15T13:00:00Z");

      await expect(
        dateChanger.validateAndChange(commit, newDate, null, nextDate),
      ).rejects.toThrow();

      expect(mockGitService.changeCommitDate).not.toHaveBeenCalled();
    });

    it("should handle git service errors", async () => {
      const commit = createMockCommit();
      const newDate = new Date("2025-01-15T11:00:00Z");

      (mockGitService.changeCommitDate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Git operation failed"),
      );

      await expect(dateChanger.validateAndChange(commit, newDate, null, null)).rejects.toThrow(
        "Git operation failed",
      );
    });

    it("should allow changing date to same as previous commit", async () => {
      const commit = createMockCommit();
      const prevDate = new Date("2025-01-15T10:00:00Z");
      const newDate = new Date("2025-01-15T10:00:00Z");

      await dateChanger.validateAndChange(commit, newDate, prevDate, null);

      expect(mockGitService.changeCommitDate).toHaveBeenCalledWith(commit.fullHash, newDate);
    });

    it("should validate date between previous and next commits", async () => {
      const commit = createMockCommit();
      const prevDate = new Date("2025-01-15T10:00:00Z");
      const nextDate = new Date("2025-01-15T14:00:00Z");
      const newDate = new Date("2025-01-15T12:00:00Z");

      await dateChanger.validateAndChange(commit, newDate, prevDate, nextDate);

      expect(mockGitService.changeCommitDate).toHaveBeenCalledWith(commit.fullHash, newDate);
    });

    it("should pass commit hash and new date to git service", async () => {
      const commit = createMockCommit({
        hash: "unique-hash-123",
        fullHash: "unique-hash-123567890abcdef1234567890abcdef123456",
      });
      const newDate = new Date("2025-01-20T15:30:00Z");

      await dateChanger.validateAndChange(commit, newDate, null, null);

      expect(mockGitService.changeCommitDate).toHaveBeenCalledWith(
        "unique-hash-123567890abcdef1234567890abcdef123456",
        newDate,
      );
      expect(mockGitService.changeCommitDate).toHaveBeenCalledTimes(1);
    });

    it("should work with no boundary constraints", async () => {
      const commit = createMockCommit();
      const pastDate = new Date("2025-01-01T00:00:00Z");

      await dateChanger.validateAndChange(commit, pastDate, null, null);

      expect(mockGitService.changeCommitDate).toHaveBeenCalledWith(commit.fullHash, pastDate);
    });

    it("should handle edge case: date exactly at next commit boundary", async () => {
      const commit = createMockCommit();
      const nextDate = new Date("2025-01-15T12:00:00Z");
      const newDate = new Date("2025-01-15T12:00:00Z");

      await dateChanger.validateAndChange(commit, newDate, null, nextDate);

      expect(mockGitService.changeCommitDate).toHaveBeenCalledWith(commit.fullHash, newDate);
    });

    it("should reject millisecond precision that exceeds next commit", async () => {
      const commit = createMockCommit();
      const nextDate = new Date("2025-01-15T12:00:00.000Z");
      const newDate = new Date("2025-01-15T12:00:00.001Z");

      await expect(
        dateChanger.validateAndChange(commit, newDate, null, nextDate),
      ).rejects.toThrow();

      expect(mockGitService.changeCommitDate).not.toHaveBeenCalled();
    });
  });
});

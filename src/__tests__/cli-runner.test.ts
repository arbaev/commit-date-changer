import { describe, it, expect, beforeEach, vi } from "vitest";
import { CliRunner, CliModeOptions } from "../core/cli-runner.js";
import { GitService } from "../core/git.js";
import { DateValidator } from "../core/validator.js";
import { DateChanger } from "../core/date-changer.js";
import { Commit } from "../types/index.js";

// Mocks for dependencies
vi.mock("../core/git.js");
vi.mock("../core/validator.js");
vi.mock("../core/date-changer.js");

describe("CliRunner", () => {
  let cliRunner: CliRunner;
  let mockGitService: GitService;
  let mockValidator: DateValidator;
  let mockDateChanger: DateChanger;

  // Test data
  const mockCommit: Commit = {
    hash: "abc1234",
    fullHash: "abc1234567890abcdef1234567890abcdef12345",
    message: "test: add feature",
    authorDate: new Date("2025-01-15T10:00:00Z"),
    committerDate: new Date("2025-01-15T10:00:00Z"),
    author: "Test Author",
    isPushed: false,
    remotes: [],
  };

  const mockPushedCommit: Commit = {
    ...mockCommit,
    hash: "def5678",
    fullHash: "def5678901234567890abcdef1234567890abcdef",
    isPushed: true,
    remotes: ["origin/main"],
  };

  beforeEach(() => {
    // Create mocks
    mockGitService = new GitService();
    mockValidator = new DateValidator();
    mockDateChanger = new DateChanger(mockGitService, mockValidator);

    // Create CliRunner instance
    cliRunner = new CliRunner(mockGitService, mockValidator, mockDateChanger);
  });

  describe("findCommitByHash", () => {
    it("should find commit by short hash", async () => {
      vi.spyOn(mockGitService, "getUnpushedCommits").mockResolvedValue([mockCommit]);

      const result = await cliRunner.findCommitByHash("abc1234", false);

      expect(result).toEqual(mockCommit);
      expect(mockGitService.getUnpushedCommits).toHaveBeenCalledWith(100);
    });

    it("should find commit by full hash", async () => {
      vi.spyOn(mockGitService, "getUnpushedCommits").mockResolvedValue([mockCommit]);

      const result = await cliRunner.findCommitByHash(
        "abc1234567890abcdef1234567890abcdef12345",
        false,
      );

      expect(result).toEqual(mockCommit);
    });

    it("should find commit by hash prefix", async () => {
      vi.spyOn(mockGitService, "getUnpushedCommits").mockResolvedValue([mockCommit]);

      const result = await cliRunner.findCommitByHash("abc", false);

      expect(result).toEqual(mockCommit);
    });

    it("should return null if commit not found", async () => {
      vi.spyOn(mockGitService, "getUnpushedCommits").mockResolvedValue([mockCommit]);

      const result = await cliRunner.findCommitByHash("notfound", false);

      expect(result).toBeNull();
    });

    it("should use getAllCommits when allowPushed=true", async () => {
      vi.spyOn(mockGitService, "getAllCommits").mockResolvedValue([mockPushedCommit]);

      const result = await cliRunner.findCommitByHash("def5678", true);

      expect(result).toEqual(mockPushedCommit);
      expect(mockGitService.getAllCommits).toHaveBeenCalledWith(100);
    });
  });

  describe("validateInputs", () => {
    it("should accept valid ISO date format", () => {
      vi.spyOn(mockValidator, "validateISOFormat").mockReturnValue({ isValid: true });

      const options: CliModeOptions = {
        hash: "abc1234",
        date: "2025-01-15T14:30",
        noConfirm: false,
        json: false,
        allowPushed: false,
      };

      const result = cliRunner.validateInputs(options);

      expect(result).toBeNull();
      expect(mockValidator.validateISOFormat).toHaveBeenCalledWith("2025-01-15T14:30");
    });

    it("should return error for invalid date format", () => {
      vi.spyOn(mockValidator, "validateISOFormat").mockReturnValue({
        isValid: false,
        error: "Invalid date format",
      });

      const options: CliModeOptions = {
        hash: "abc1234",
        date: "invalid-date",
        noConfirm: false,
        json: false,
        allowPushed: false,
      };

      const result = cliRunner.validateInputs(options);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect(result?.errorCode).toBe("INVALID_DATE_FORMAT");
    });
  });

  describe("execute", () => {
    it("should successfully change date of local commit", async () => {
      const newDate = new Date("2025-01-15T14:30:00Z");

      vi.spyOn(mockValidator, "validateISOFormat").mockReturnValue({ isValid: true });
      vi.spyOn(mockValidator, "parseDate").mockReturnValue(newDate);
      vi.spyOn(mockValidator, "validateDate").mockReturnValue({ isValid: true });
      vi.spyOn(mockGitService, "getUnpushedCommits").mockResolvedValue([mockCommit]);
      vi.spyOn(mockDateChanger, "validateAndChange").mockResolvedValue();

      const options: CliModeOptions = {
        hash: "abc1234",
        date: "2025-01-15T14:30",
        noConfirm: false,
        json: false,
        allowPushed: false,
      };

      const result = await cliRunner.execute(options);

      expect(result.success).toBe(true);
      expect(result.commit?.hash).toBe("abc1234");
      expect(result.commit?.newDate).toBe(newDate.toISOString());
      expect(mockDateChanger.validateAndChange).toHaveBeenCalled();
    });

    it("should return error when commit not found", async () => {
      vi.spyOn(mockValidator, "validateISOFormat").mockReturnValue({ isValid: true });
      vi.spyOn(mockGitService, "getUnpushedCommits").mockResolvedValue([]);

      const options: CliModeOptions = {
        hash: "notfound",
        date: "2025-01-15T14:30",
        noConfirm: false,
        json: false,
        allowPushed: false,
      };

      const result = await cliRunner.execute(options);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("COMMIT_NOT_FOUND");
    });

    it("should return error for pushed commit without noConfirm", async () => {
      vi.spyOn(mockValidator, "validateISOFormat").mockReturnValue({ isValid: true });
      vi.spyOn(mockGitService, "getAllCommits").mockResolvedValue([mockPushedCommit]);

      const options: CliModeOptions = {
        hash: "def5678",
        date: "2025-01-15T14:30",
        noConfirm: false,
        json: false,
        allowPushed: true,
      };

      const result = await cliRunner.execute(options);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PUSHED_REQUIRES_CONFIRM");
    });

    it("should successfully change pushed commit with noConfirm", async () => {
      const newDate = new Date("2025-01-15T14:30:00Z");

      vi.spyOn(mockValidator, "validateISOFormat").mockReturnValue({ isValid: true });
      vi.spyOn(mockValidator, "parseDate").mockReturnValue(newDate);
      vi.spyOn(mockValidator, "validateDate").mockReturnValue({ isValid: true });
      vi.spyOn(mockGitService, "getAllCommits").mockResolvedValue([mockPushedCommit]);
      vi.spyOn(mockDateChanger, "validateAndChange").mockResolvedValue();

      const options: CliModeOptions = {
        hash: "def5678",
        date: "2025-01-15T14:30",
        noConfirm: true,
        json: false,
        allowPushed: true,
      };

      const result = await cliRunner.execute(options);

      expect(result.success).toBe(true);
      expect(result.commit?.isPushed).toBe(true);
      expect(mockDateChanger.validateAndChange).toHaveBeenCalled();
    });

    it("should return error when date cannot be parsed", async () => {
      vi.spyOn(mockValidator, "validateISOFormat").mockReturnValue({ isValid: true });
      vi.spyOn(mockValidator, "parseDate").mockReturnValue(null);
      vi.spyOn(mockGitService, "getUnpushedCommits").mockResolvedValue([mockCommit]);

      const options: CliModeOptions = {
        hash: "abc1234",
        date: "2025-01-15T14:30",
        noConfirm: false,
        json: false,
        allowPushed: false,
      };

      const result = await cliRunner.execute(options);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("DATE_PARSING_ERROR");
    });

    it("should return error when date is out of valid range", async () => {
      const newDate = new Date("2025-01-15T14:30:00Z");

      vi.spyOn(mockValidator, "validateISOFormat").mockReturnValue({ isValid: true });
      vi.spyOn(mockValidator, "parseDate").mockReturnValue(newDate);
      vi.spyOn(mockValidator, "validateDate").mockReturnValue({
        isValid: false,
        error: "Date is out of range",
      });
      vi.spyOn(mockGitService, "getUnpushedCommits").mockResolvedValue([mockCommit]);

      const options: CliModeOptions = {
        hash: "abc1234",
        date: "2025-01-15T14:30",
        noConfirm: false,
        json: false,
        allowPushed: false,
      };

      const result = await cliRunner.execute(options);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("DATE_OUT_OF_RANGE");
    });

    it("should handle exception and return EXECUTION_ERROR", async () => {
      vi.spyOn(mockValidator, "validateISOFormat").mockReturnValue({ isValid: true });
      vi.spyOn(mockGitService, "getUnpushedCommits").mockRejectedValue(new Error("Git error"));

      const options: CliModeOptions = {
        hash: "abc1234",
        date: "2025-01-15T14:30",
        noConfirm: false,
        json: false,
        allowPushed: false,
      };

      const result = await cliRunner.execute(options);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("EXECUTION_ERROR");
      expect(result.error).toContain("Git error");
    });
  });

  describe("formatOutput", () => {
    it("should format successful result as JSON", () => {
      const result = {
        success: true,
        commit: {
          hash: "abc1234",
          message: "test: add feature",
          oldDate: "2025-01-15T10:00:00.000Z",
          newDate: "2025-01-15T14:30:00.000Z",
          isPushed: false,
        },
      };

      const output = cliRunner.formatOutput(result, true);
      const parsed = JSON.parse(output);

      expect(parsed.success).toBe(true);
      expect(parsed.commit.hash).toBe("abc1234");
    });

    it("should format error as JSON", () => {
      const result = {
        success: false,
        error: "Commit not found",
        errorCode: "COMMIT_NOT_FOUND",
      };

      const output = cliRunner.formatOutput(result, true);
      const parsed = JSON.parse(output);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Commit not found");
      expect(parsed.errorCode).toBe("COMMIT_NOT_FOUND");
    });

    it("should format successful result as text", () => {
      const result = {
        success: true,
        commit: {
          hash: "abc1234",
          message: "test: add feature",
          oldDate: "2025-01-15T10:00:00.000Z",
          newDate: "2025-01-15T14:30:00.000Z",
          isPushed: false,
        },
      };

      const output = cliRunner.formatOutput(result, false);

      expect(output).toContain("Success");
      expect(output).toContain("abc1234");
      expect(output).toContain("2025-01-15T10:00:00.000Z");
      expect(output).toContain("2025-01-15T14:30:00.000Z");
    });

    it("should format error as text", () => {
      const result = {
        success: false,
        error: "Commit not found",
        errorCode: "COMMIT_NOT_FOUND",
      };

      const output = cliRunner.formatOutput(result, false);

      expect(output).toContain("Error");
      expect(output).toContain("Commit not found");
    });
  });
});

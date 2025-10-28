import { vi } from "vitest";

// Mock i18n module
vi.mock("../i18n.js", () => ({
  t: (key: string) => {
    // Simple mock that returns the key
    const translations: Record<string, string> = {
      "validator.invalidDate": "Invalid date. Use ISO format: YYYY-MM-DDTHH:mm",
      "validator.parseError": "Date parsing error. Use ISO format: YYYY-MM-DDTHH:mm",
      "validator.futureDate": "Date cannot be in the future",
      "validator.beforePrevious": "Date cannot be earlier than previous commit",
      "validator.afterNext": "Date cannot be later than next commit",
      "validator.noLimit": "no limit",
      "messages.warningTitle": "⚠️  WARNING:",
      "messages.pushedModeTitle": "Pushed commits modification mode",
      "messages.pushedChangeWarning": "Modifying pushed commits:",
      "messages.rewritesHistory": "- Rewrites Git history",
      "messages.requiresForce": "- Requires force push",
      "messages.breakOthers": "- May break other developers' work",
      "messages.causesConflicts": "- May cause conflicts on pull",
      "messages.useOnlyIf": "Use only if:",
      "messages.personalBranch": "✓ You are working in a personal branch",
      "messages.noOthers": "✓ No one else is using this branch",
      "messages.understandForce": "✓ You understand the consequences of force push",
      "messages.dangerTitle": "⚠️  DANGER:",
      "messages.commitAlreadyPushed": "This commit is ALREADY PUSHED",
      "messages.commit": "Commit:",
      "messages.pushedTo": "Pushed to:",
      "messages.modificationRequires": "Modification will REQUIRE:",
      "messages.forcePushCommand": "git push --force-with-lease",
      "messages.afterChange": "⚠️  After modification you will need:",
      "messages.important": "⚠️  IMPORTANT:",
      "messages.commitWasPushed": "Commit was pushed. To synchronize, run:",
      "messages.warnTeam": "⚠️  Warn your team about force push!",
    };
    return translations[key] || key;
  },
  initI18n: vi.fn(),
  detectSystemLanguage: vi.fn(() => "en"),
}));

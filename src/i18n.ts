import i18next from "i18next";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect system language from environment variables
 */
export function detectSystemLanguage(): string {
  // Priority:
  // 1. process.env.LANGUAGE (can be a list, take first)
  // 2. process.env.LANG
  // 3. process.env.LC_ALL
  const envLang =
    process.env.LANGUAGE?.split(":")[0] || process.env.LANG || process.env.LC_ALL || "en";

  // Parse locale like ru_RU.UTF-8 -> ru
  const langCode = envLang.split(".")[0].split("_")[0].toLowerCase();

  // Supported languages
  const supportedLanguages = ["en", "ru"];

  return supportedLanguages.includes(langCode) ? langCode : "en";
}

/**
 * Initialize i18next with selected language
 */
export async function initI18n(forceLang?: string): Promise<void> {
  const language = forceLang || detectSystemLanguage();

  // Load translations
  const enTranslation = JSON.parse(readFileSync(join(__dirname, "locales", "en.json"), "utf-8"));
  const ruTranslation = JSON.parse(readFileSync(join(__dirname, "locales", "ru.json"), "utf-8"));

  await i18next.init({
    lng: language,
    fallbackLng: "en",
    resources: {
      en: { translation: enTranslation },
      ru: { translation: ruTranslation },
    },
  });
}

/**
 * Get translation function (shorthand)
 */
export function t(key: string, params?: Record<string, string>): string {
  return i18next.t(key, params);
}

export { i18next };

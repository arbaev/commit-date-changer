import i18next from "i18next";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Определить язык системы из переменных окружения
 */
export function detectSystemLanguage(): string {
  // Приоритет:
  // 1. process.env.LANGUAGE (может быть список, берем первый)
  // 2. process.env.LANG
  // 3. process.env.LC_ALL
  const envLang =
    process.env.LANGUAGE?.split(":")[0] || process.env.LANG || process.env.LC_ALL || "en";

  // Парсим локаль типа ru_RU.UTF-8 -> ru
  const langCode = envLang.split(".")[0].split("_")[0].toLowerCase();

  // Поддерживаемые языки
  const supportedLanguages = ["en", "ru"];

  return supportedLanguages.includes(langCode) ? langCode : "en";
}

/**
 * Инициализировать i18next с выбранным языком
 */
export async function initI18n(forceLang?: string): Promise<void> {
  const language = forceLang || detectSystemLanguage();

  // Загрузка переводов
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
 * Получить функцию перевода (shorthand)
 */
export function t(key: string, params?: Record<string, string>): string {
  return i18next.t(key, params);
}

export { i18next };

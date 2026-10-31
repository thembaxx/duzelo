import en from "./en.json";
import zu from "./zu.json";
import ss from "./ss.json";

export const locales = ["en", "zu", "ss"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const localeLabels: Record<Locale, string> = { en: "English", zu: "isiZulu", ss: "siSwati" };
const pending: Partial<Record<Locale, Partial<typeof en>>> = { zu, ss };
export function getMessages(locale: Locale = defaultLocale): typeof en {
  // Entire untranslated sections fall back to English; no fake translations.
  return { ...en, ...pending[locale] };
}
export const formatting = {
  locale: "en-ZA",
  currency: "ZAR",
  timeZone: "Africa/Johannesburg",
} as const;

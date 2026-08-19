export const locales = ["es", "ca", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export const localeLabels: Record<Locale, string> = {
  es: "Español",
  ca: "Valencià",
  en: "English",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

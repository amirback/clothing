/**
 * Locale configuration.
 *
 * Adding a language = add it to `LOCALES`, drop a dictionary next to
 * `dictionaries/ru.ts` and register it in `dictionaries/index.ts`.
 * Nothing else in the app needs to change.
 */

export const LOCALES = ["ru", "en", "kk"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ru";

/** Shown in the language switcher; `native` is what a speaker calls it. */
export const LOCALE_META: Record<Locale, { native: string; short: string; htmlLang: string }> = {
  ru: { native: "Русский", short: "RU", htmlLang: "ru" },
  en: { native: "English", short: "EN", htmlLang: "en" },
  kk: { native: "Қазақша", short: "KK", htmlLang: "kk" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the best locale from an `Accept-Language` header.
 * Falls back to the default when nothing matches.
 */
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

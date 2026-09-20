import { DEFAULT_LOCALE, type Locale } from "./config";
import { en } from "./dictionaries/en";
import { kk } from "./dictionaries/kk";
import { ru, type Dictionary, type ErrorCode } from "./dictionaries/ru";

const DICTIONARIES: Record<Locale, Dictionary> = { ru, en, kk };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Fills `{name}` placeholders in a translated string.
 * Keeps interpolation out of the dictionaries themselves, so translators only
 * ever see plain text with named slots.
 */
export function format(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export type { Dictionary, ErrorCode };

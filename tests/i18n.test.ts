import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { kk } from "@/lib/i18n/dictionaries/kk";
import { ru } from "@/lib/i18n/dictionaries/ru";
import { format } from "@/lib/i18n";
import { LOCALES, LOCALE_META, matchLocale } from "@/lib/i18n/config";

/**
 * Guards the translation layer.
 *
 * TypeScript already refuses a dictionary with a missing key, but it cannot
 * catch an empty string, a forgotten placeholder or a locale that was added to
 * the config and never given a dictionary. These do.
 */

const DICTIONARIES = { ru, en, kk } as const;

/** Flattens a nested dictionary into "a.b.c" -> value pairs. */
function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (typeof value !== "object" || value === null) return {};
  return Object.entries(value).reduce<Record<string, string>>(
    (acc, [key, child]) => Object.assign(acc, flatten(child, prefix ? `${prefix}.${key}` : key)),
    {},
  );
}

const flatRu = flatten(ru);

describe("dictionaries", () => {
  it("covers every configured locale", () => {
    expect(Object.keys(DICTIONARIES).sort()).toEqual([...LOCALES].sort());
    for (const locale of LOCALES) expect(LOCALE_META[locale]).toBeDefined();
  });

  it.each(Object.entries(DICTIONARIES))("%s has exactly the same keys as ru", (_name, dict) => {
    expect(Object.keys(flatten(dict)).sort()).toEqual(Object.keys(flatRu).sort());
  });

  it.each(Object.entries(DICTIONARIES))("%s has no blank strings", (name, dict) => {
    const blank = Object.entries(flatten(dict))
      .filter(([, text]) => text.trim().length === 0)
      .map(([key]) => key);
    expect(blank, `blank strings in ${name}`).toEqual([]);
  });

  it.each(Object.entries(DICTIONARIES))("%s keeps every {placeholder} used by ru", (name, dict) => {
    const placeholders = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort();
    const flat = flatten(dict);
    for (const [key, russian] of Object.entries(flatRu)) {
      expect(placeholders(flat[key]), `${name}.${key}`).toEqual(placeholders(russian));
    }
  });

  it.each(Object.entries(DICTIONARIES))("%s translates every error code", (_name, dict) => {
    expect(Object.keys(dict.errors).sort()).toEqual(Object.keys(ru.errors).sort());
  });
});

describe("format", () => {
  it("fills named placeholders", () => {
    expect(format("Подождите {seconds} с.", { seconds: 12 })).toBe("Подождите 12 с.");
  });

  it("fills a placeholder used more than once", () => {
    expect(format("{a} и ещё {a}", { a: "раз" })).toBe("раз и ещё раз");
  });

  it("leaves an unknown placeholder untouched rather than printing undefined", () => {
    expect(format("Максимум {maxMb} МБ", {})).toBe("Максимум {maxMb} МБ");
  });
});

describe("matchLocale", () => {
  it.each([
    ["ru-RU,ru;q=0.9,en;q=0.8", "ru"],
    ["en-US,en;q=0.9", "en"],
    ["kk-KZ,kk;q=0.9", "kk"],
    ["de-DE,de;q=0.9", "ru"],
    [null, "ru"],
    ["", "ru"],
  ])("resolves %s to %s", (header, expected) => {
    expect(matchLocale(header)).toBe(expected);
  });

  it("honours quality weights rather than header order", () => {
    expect(matchLocale("de;q=1.0, en;q=0.9, ru;q=0.2")).toBe("en");
  });
});

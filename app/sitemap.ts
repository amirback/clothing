import type { MetadataRoute } from "next";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** One entry per language, cross-linked with hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 1,
    alternates: {
      languages: Object.fromEntries(
        LOCALES.map((other) => [LOCALE_META[other].htmlLang, `${SITE_URL}/${other}`]),
      ),
    },
  }));
}

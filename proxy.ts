import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, matchLocale } from "@/lib/i18n/config";

/**
 * Sends every bare path to a locale-prefixed one (`/` -> `/ru`).
 *
 * Order of preference: the `locale` cookie the switcher sets, then the
 * browser's `Accept-Language`, then the default. The choice is a redirect
 * rather than a rewrite so the visitor always has a shareable, indexable URL.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const cookieLocale = request.cookies.get("locale")?.value;
  const locale =
    cookieLocale && LOCALES.includes(cookieLocale as (typeof LOCALES)[number])
      ? cookieLocale
      : matchLocale(request.headers.get("accept-language")) || DEFAULT_LOCALE;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except API routes, Next internals and static files.
  matcher: ["/((?!api|_next|catalog|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};

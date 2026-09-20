"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

/**
 * Switches language while staying on the current path.
 *
 * The choice is stored in a cookie so the middleware honours it on the next
 * bare-path visit instead of guessing from `Accept-Language` again.
 */
/** Remembers the choice so the proxy honours it instead of re-guessing. */
function rememberLocale(next: Locale) {
  // A year is long enough to be remembered, short enough to be revisited.
  document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function switchTo(next: Locale) {
    rememberLocale(next);
    const rest = pathname.replace(new RegExp(`^/(${LOCALES.join("|")})`), "");
    router.push(`/${next}${rest}`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className="btn btn-ghost h-9 px-3 text-sm"
      >
        <GlobeIcon />
        <span>{LOCALE_META[locale].short}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="panel pop-in absolute right-0 z-50 mt-2 w-40 overflow-hidden p-1 shadow-lg"
        >
          {LOCALES.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === locale}
                onClick={() => switchTo(option)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  option === locale
                    ? "bg-sunken font-semibold text-ink"
                    : "text-ink-soft hover:bg-sunken hover:text-ink"
                }`}
              >
                <span>{LOCALE_META[option].native}</span>
                <span className="text-ink-muted text-xs">{LOCALE_META[option].short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

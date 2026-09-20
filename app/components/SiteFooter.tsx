import type { Dictionary } from "@/lib/i18n";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

export function SiteFooter({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold tracking-tight">{dict.studio.title}</p>
            <p className="lede max-w-xl text-sm">{dict.footer.disclaimer}</p>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <p className="flex items-center gap-2 text-ink-soft">
              <ShieldIcon />
              {dict.footer.privacy}
            </p>
            <a
              href="https://unsplash.com/license"
              target="_blank"
              rel="noreferrer noopener"
              className="w-fit text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              {dict.footer.photos}
            </a>
            <nav aria-label={dict.lang.label} className="mt-2 flex flex-wrap gap-2">
              {LOCALES.map((option) => (
                <a
                  key={option}
                  href={`/${option}`}
                  hrefLang={LOCALE_META[option].htmlLang}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    option === locale
                      ? "border-ink bg-ink text-paper"
                      : "border-line-strong text-ink-soft hover:border-ink-muted hover:text-ink"
                  }`}
                >
                  {LOCALE_META[option].native}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-ink-muted">
          {dict.footer.rights} · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0 text-accent" aria-hidden="true">
      <path
        d="M12 3.2 5 6v5.4c0 4.2 2.9 8.1 7 9.4 4.1-1.3 7-5.2 7-9.4V6l-7-2.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m9 12 2.2 2.2L15.5 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

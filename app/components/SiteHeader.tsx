"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Sticky header; the hairline border only appears once the page has scrolled. */
export function SiteHeader({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl transition-colors duration-300 ${
        scrolled ? "border-b border-line bg-paper/85" : "border-b border-transparent bg-paper/40"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href={`/${locale}`} className="flex items-center gap-2.5 font-bold tracking-tight">
          <Logo />
          <span className="text-[15px]">{dict.studio.title}</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label={dict.nav.how}>
          <NavLink href="#how">{dict.nav.how}</NavLink>
          <NavLink href="#faq">{dict.nav.faq}</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={dict.lang.change} />
          <a href="#studio" className="btn btn-primary h-9 px-4 text-sm">
            {dict.nav.tryOn}
          </a>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
    >
      {children}
    </a>
  );
}

function Logo() {
  return (
    <span className="flex size-8 items-center justify-center rounded-[10px] bg-ink text-paper">
      <svg viewBox="0 0 24 24" fill="none" className="size-4.5" aria-hidden="true">
        {/* A hanger: the most legible one-glyph sign for a fitting room. */}
        <path
          d="M12 6.5a2 2 0 1 1 2 2c-1.2 0-2 .8-2 2v.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 11.3 4.4 16.2c-.9.6-.5 2 .6 2h14c1.1 0 1.5-1.4.6-2L12 11.3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

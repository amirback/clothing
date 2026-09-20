import Image from "next/image";
import type { Dictionary } from "@/lib/i18n";
import { CATALOG } from "@/lib/catalog";

/**
 * Above-the-fold section.
 *
 * The visual is built from real catalog photography rather than an abstract
 * illustration: it shows the visitor what they are about to do.
 */
export function Hero({ dict }: { dict: Dictionary }) {
  return (
    <section className="relative overflow-hidden">
      {/* Soft radial wash behind the fold; purely decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-32 h-[38rem] opacity-70"
        style={{
          background:
            "radial-gradient(60% 55% at 78% 30%, var(--accent-soft) 0%, transparent 70%), radial-gradient(45% 45% at 15% 15%, var(--surface-sunken) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,27rem)] lg:gap-16 lg:px-8 lg:pt-24 lg:pb-24">
        <div className="flex flex-col justify-center">
          <span
            className="enter mb-6 flex w-fit items-center gap-2 rounded-full border border-line-strong bg-surface/70 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-ink-soft backdrop-blur"
            style={{ "--delay": "0ms" } as React.CSSProperties}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            {dict.hero.badge}
          </span>

          <h1
            className="display enter text-[clamp(2.25rem,5.6vw,4.1rem)]"
            style={{ "--delay": "70ms" } as React.CSSProperties}
          >
            {dict.hero.titleLine1}
            <br />
            <span className="text-ink-muted">{dict.hero.titleLine2}</span>
          </h1>

          <p
            className="lede enter mt-6 max-w-xl text-base sm:text-lg"
            style={{ "--delay": "140ms" } as React.CSSProperties}
          >
            {dict.hero.subtitle}
          </p>

          <div
            className="enter mt-9 flex flex-wrap items-center gap-3"
            style={{ "--delay": "210ms" } as React.CSSProperties}
          >
            <a href="#studio" className="btn btn-primary h-12 px-7 text-[15px]">
              {dict.hero.ctaPrimary}
              <ArrowIcon />
            </a>
            <a href="#how" className="btn btn-ghost h-12 px-6 text-[15px]">
              {dict.hero.ctaSecondary}
            </a>
          </div>

          <dl
            className="enter mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-7"
            style={{ "--delay": "280ms" } as React.CSSProperties}
          >
            <Stat value="10–30" label={dict.hero.stat1} />
            <Stat value={String(CATALOG.length)} label={dict.hero.stat2} />
            <Stat value={dict.hero.stat3Value} label={dict.hero.stat3} />
          </dl>
        </div>

        <HeroCollage />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">{value}</dt>
      <dd className="text-xs leading-snug text-ink-muted">{label}</dd>
    </div>
  );
}

/** Three on-model catalog shots, gently drifting at different phases. */
function HeroCollage() {
  const cards = [
    { file: "tee-stripe.jpg", className: "col-span-7 row-span-6 col-start-1 row-start-1", tilt: "-2.5deg", delay: "0ms", duration: "7.5s" },
    { file: "dress-terracotta.jpg", className: "col-span-6 row-span-7 col-start-8 row-start-2", tilt: "2deg", delay: "600ms", duration: "8.5s" },
    { file: "hoodie-print.jpg", className: "col-span-6 row-span-5 col-start-3 row-start-7", tilt: "1.5deg", delay: "1100ms", duration: "9s" },
  ];

  return (
    <div className="enter relative hidden lg:block" style={{ "--delay": "160ms" } as React.CSSProperties}>
      <div className="grid aspect-4/5 w-full grid-cols-13 grid-rows-11 gap-3">
        {cards.map((card) => (
          <figure
            key={card.file}
            className={`float relative overflow-hidden rounded-2xl bg-sunken shadow-xl ring-1 ring-black/5 ${card.className}`}
            style={
              {
                "--tilt": card.tilt,
                "--delay": card.delay,
                "--float-duration": card.duration,
              } as React.CSSProperties
            }
          >
            <Image
              src={`/catalog/${card.file}`}
              alt=""
              fill
              sizes="(max-width: 1024px) 0px, 22vw"
              className="object-cover"
              priority
            />
          </figure>
        ))}
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

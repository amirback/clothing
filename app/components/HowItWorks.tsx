import type { Dictionary } from "@/lib/i18n";

export function HowItWorks({ dict }: { dict: Dictionary }) {
  const steps = [
    { title: dict.how.step1Title, text: dict.how.step1Text, icon: <PersonIcon /> },
    { title: dict.how.step2Title, text: dict.how.step2Text, icon: <HangerIcon /> },
    { title: dict.how.step3Title, text: dict.how.step3Text, icon: <SparkIcon /> },
  ];

  return (
    <section id="how" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="reveal mb-12 flex flex-col gap-3">
          <h2 className="section-title text-[clamp(1.75rem,3.6vw,2.6rem)]">{dict.how.title}</h2>
          <p className="lede max-w-xl">{dict.how.subtitle}</p>
        </div>

        <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="reveal panel flex flex-col gap-4 p-6 transition-shadow duration-300 hover:shadow-md sm:p-7"
              style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-card bg-sunken text-ink">
                  {step.icon}
                </span>
                <span className="text-4xl font-bold tracking-tight text-line-strong tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="lede text-sm">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.8 20c.6-3.8 3.6-6 7.2-6s6.6 2.2 7.2 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function HangerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M12 6.5a2 2 0 1 1 2 2c-1.2 0-2 .8-2 2v.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 11.3 4.4 16.2c-.9.6-.5 2 .6 2h14c1.1 0 1.5-1.4.6-2L12 11.3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13 4.5 11l5.6-2L12 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

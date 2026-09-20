"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";

/** Accordion; the open panel animates via grid-template-rows so height is fluid. */
export function Faq({ dict }: { dict: Dictionary }) {
  const items = [
    { q: dict.faq.q1, a: dict.faq.a1 },
    { q: dict.faq.q2, a: dict.faq.a2 },
    { q: dict.faq.q3, a: dict.faq.a3 },
    { q: dict.faq.q4, a: dict.faq.a4 },
    { q: dict.faq.q5, a: dict.faq.a5 },
  ];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="section-title reveal mb-10 text-[clamp(1.75rem,3.6vw,2.6rem)]">{dict.faq.title}</h2>

        <ul className="flex flex-col">
          {items.map((item, index) => {
            const open = openIndex === index;
            return (
              <li key={item.q} className="reveal border-b border-line" style={{ "--delay": `${index * 50}ms` } as React.CSSProperties}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : index)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-accent"
                  >
                    <span className="text-[15px] font-semibold tracking-tight sm:text-base">{item.q}</span>
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong transition-transform duration-300 ${
                        open ? "rotate-45" : ""
                      }`}
                    >
                      <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden="true">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
                >
                  <div className="overflow-hidden">
                    <p className="lede pb-5 text-sm">{item.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

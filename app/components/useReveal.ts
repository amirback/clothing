"use client";

import { useEffect } from "react";

/**
 * Reveals `.reveal` elements as they scroll into view.
 *
 * One observer for the whole page rather than a hook per component, and it
 * unobserves after the first reveal so nothing keeps running once the visitor
 * has seen a section. Elements stay visible if IntersectionObserver is missing.
 */
export function useReveal() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (targets.length === 0) return;

    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

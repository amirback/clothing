"use client";

import { useReveal } from "./useReveal";

/** Mounts the single page-wide scroll-reveal observer. Renders nothing. */
export function RevealOnScroll() {
  useReveal();
  return null;
}

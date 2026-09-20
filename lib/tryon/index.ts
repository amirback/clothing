import { createDemoProvider } from "./demo";
import { createFashnProvider } from "./fashn";
import type { TryOnProvider } from "./types";

/**
 * Picks the try-on provider for this deployment.
 *
 * With `FASHN_API_KEY` set the real model runs; without it the app falls back
 * to the watermarked demo stub instead of erroring, so a fresh clone works
 * immediately (`npm run dev`) and a missing key on the server never shows the
 * visitor a broken page.
 */
export function getTryOnProvider(): TryOnProvider {
  const apiKey = process.env.FASHN_API_KEY?.trim();
  if (apiKey) return createFashnProvider(apiKey);
  return createDemoProvider();
}

export { TryOnError } from "./types";
export type { GarmentCategory, TryOnMode, TryOnResult } from "./types";

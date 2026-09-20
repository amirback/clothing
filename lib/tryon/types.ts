/**
 * Provider-agnostic contract for virtual try-on.
 *
 * The app never talks to a vendor SDK directly: it asks for a provider through
 * `lib/tryon/index.ts` and calls `run()`. Swapping FASHN for Replicate, fal.ai
 * or a self-hosted model means adding one file here, not touching the UI.
 */

/** Garment types understood by the try-on model. */
export type GarmentCategory = "auto" | "tops" | "bottoms" | "one-pieces";

/** Quality/latency trade-off. Higher quality costs more time, not more money. */
export type TryOnMode = "performance" | "balanced" | "quality";

export type TryOnRequest = {
  /** Photo of the person. Public https URL or a `data:` URI. */
  personImage: string;
  /** Photo of the garment (flat-lay or on-model). Public https URL or `data:` URI. */
  garmentImage: string;
  category: GarmentCategory;
  mode?: TryOnMode;
};

export type TryOnResult = {
  /** Displayable image: https URL or `data:` URI. */
  imageUrl: string;
  provider: string;
  model: string;
  elapsedMs: number;
  /** True when produced by the offline stub instead of a real model. */
  demo: boolean;
};

export interface TryOnProvider {
  readonly name: string;
  readonly model: string;
  /** True for the offline stub used when no API key is configured. */
  readonly isDemo: boolean;
  run(request: TryOnRequest, signal?: AbortSignal): Promise<TryOnResult>;
}

/** Error with a message that is safe to show to an end user, in Russian. */
export class TryOnError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TryOnError";
  }
}

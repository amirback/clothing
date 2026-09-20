import type { ErrorCode } from "@/lib/i18n/dictionaries/ru";

/** Input validation for uploaded images. Rejects early, before any paid call. */

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Decoded byte ceiling per image. The browser downscales before upload, so a
 * larger payload means either an unusual camera file or a crafted request. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const DATA_URI_PATTERN = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i;

export type ValidatedImage = { dataUri: string; mime: string; bytes: number };

/** Carries a translation key; the browser renders it in the active language. */
export class ValidationError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly params: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = "ValidationError";
  }
}

type FieldCodes = { missing: ErrorCode; format: ErrorCode; tooLarge: ErrorCode };

export const PERSON_CODES: FieldCodes = {
  missing: "PERSON_MISSING",
  format: "PERSON_FORMAT",
  tooLarge: "PERSON_TOO_LARGE",
};

export const GARMENT_CODES: FieldCodes = {
  missing: "GARMENT_MISSING",
  format: "GARMENT_FORMAT",
  tooLarge: "GARMENT_TOO_LARGE",
};

/**
 * Validates a client-supplied `data:` image URI.
 *
 * Only base64 `data:` URIs are accepted — never a remote URL, which would let a
 * caller point our server at an arbitrary host (SSRF).
 */
export function validateImageDataUri(value: unknown, codes: FieldCodes): ValidatedImage {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(codes.missing);
  }

  const match = DATA_URI_PATTERN.exec(value.trim());
  if (!match) throw new ValidationError(codes.format);

  const [, mime, base64] = match;
  if (!ALLOWED_MIME.has(mime.toLowerCase())) throw new ValidationError(codes.format);

  const normalized = base64.replace(/\s/g, "");
  // 4 base64 chars encode 3 bytes; padding trims 1-2 of them.
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((normalized.length * 3) / 4) - padding;

  if (bytes <= 0) throw new ValidationError(codes.format);
  if (bytes > MAX_IMAGE_BYTES) {
    throw new ValidationError(codes.tooLarge, { maxMb: MAX_IMAGE_BYTES / 1024 / 1024 });
  }

  return { dataUri: `data:${mime};base64,${normalized}`, mime: mime.toLowerCase(), bytes };
}

/** Input validation for uploaded images. Rejects early, before any paid call. */

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Decoded byte ceiling per image. The browser downscales before upload, so a
 * larger payload means either an unusual camera file or a crafted request. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const DATA_URI_PATTERN = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i;

export type ValidatedImage = { dataUri: string; mime: string; bytes: number };

export class ValidationError extends Error {}

/**
 * Validates a client-supplied `data:` image URI.
 *
 * Only base64 `data:` URIs are accepted — never a remote URL, which would let a
 * caller point our server at an arbitrary host (SSRF).
 */
export function validateImageDataUri(value: unknown, fieldLabel: string): ValidatedImage {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`${fieldLabel}: изображение не передано.`);
  }

  const match = DATA_URI_PATTERN.exec(value.trim());
  if (!match) {
    throw new ValidationError(`${fieldLabel}: неподдерживаемый формат. Нужен JPEG, PNG или WebP.`);
  }

  const [, mime, base64] = match;
  if (!ALLOWED_MIME.has(mime.toLowerCase())) {
    throw new ValidationError(`${fieldLabel}: неподдерживаемый формат (${mime}). Нужен JPEG, PNG или WebP.`);
  }

  const normalized = base64.replace(/\s/g, "");
  // 4 base64 chars encode 3 bytes; padding trims 1-2 of them.
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((normalized.length * 3) / 4) - padding;

  if (bytes <= 0) {
    throw new ValidationError(`${fieldLabel}: файл пустой или повреждён.`);
  }
  if (bytes > MAX_IMAGE_BYTES) {
    throw new ValidationError(
      `${fieldLabel}: файл слишком большой (${(bytes / 1024 / 1024).toFixed(1)} МБ). Максимум ${MAX_IMAGE_BYTES / 1024 / 1024} МБ.`,
    );
  }

  return { dataUri: `data:${mime};base64,${normalized}`, mime: mime.toLowerCase(), bytes };
}

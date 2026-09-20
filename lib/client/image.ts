import type { ErrorCode } from "@/lib/i18n/dictionaries/ru";

/**
 * Browser-side image preparation.
 *
 * A phone photo is 3-12 MB; the model does not need more than ~1024px on the
 * long edge. Downscaling before upload cuts upload time on mobile data, keeps
 * the request inside the platform body limit, and speeds up generation.
 */

export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.9;

/** Carries a translation key so the caller renders it in the active language. */
export class ImagePrepareError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly params: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = "ImagePrepareError";
  }
}

export type PreparedImage = { dataUri: string; width: number; height: number };

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new ImagePrepareError("FILE_NOT_IMAGE");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImagePrepareError("FILE_TOO_LARGE", {
      sizeMb: (file.size / 1024 / 1024).toFixed(1),
      maxMb: MAX_SOURCE_BYTES / 1024 / 1024,
    });
  }

  const bitmap = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImagePrepareError("FILE_UNREADABLE");

  // White backdrop: a transparent PNG would otherwise flatten to black in JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return { dataUri: canvas.toDataURL("image/jpeg", JPEG_QUALITY), width, height };
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Safari/HEIC and a few exotic formats land here.
    throw new ImagePrepareError("FILE_UNREADABLE");
  }
}

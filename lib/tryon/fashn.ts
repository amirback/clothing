import {
  TryOnError,
  type TryOnProvider,
  type TryOnRequest,
  type TryOnResult,
} from "./types";

/**
 * FASHN AI virtual try-on (https://docs.fashn.ai).
 *
 * Async API: POST /v1/run returns a prediction id, then GET /v1/run/{id} is
 * polled until `status` is `completed` or `failed`.
 * Billing is per successful output image, so a failed poll costs nothing.
 */

const API_BASE = process.env.FASHN_API_BASE?.replace(/\/$/, "") ?? "https://api.fashn.ai/v1";
const MODEL_NAME = process.env.FASHN_MODEL ?? "tryon-v1.6";

/** Hard ceiling for one generation. Keep below the platform's function timeout. */
const TOTAL_TIMEOUT_MS = Number(process.env.TRYON_TIMEOUT_MS ?? 55_000);
const POLL_INTERVAL_MS = 1_500;

type RunResponse = { id?: string; error?: unknown };
type StatusResponse = {
  id: string;
  status: "starting" | "in_queue" | "processing" | "completed" | "failed";
  output?: string[] | null;
  error?: unknown;
};

/** FASHN returns errors as a string or as `{ name, message }`. */
function readError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as { message?: unknown; name?: unknown };
    if (typeof e.message === "string") return e.message;
    if (typeof e.name === "string") return e.name;
  }
  return JSON.stringify(error);
}

/** Maps provider failures to messages we are willing to show to a visitor. */
function userFacingError(raw: string): string {
  const text = raw.toLowerCase();
  if (text.includes("moderation") || text.includes("nsfw")) {
    return "Фото не прошло модерацию. Загрузите обычное фото в одежде, в полный рост или по пояс.";
  }
  if (text.includes("pose") || text.includes("no person") || text.includes("detect")) {
    return "Не удалось распознать человека на фото. Нужен снимок анфас, целиком в кадре, без сильных обрезаний.";
  }
  if (text.includes("image") && (text.includes("load") || text.includes("invalid"))) {
    return "Не удалось обработать изображение. Попробуйте другое фото (JPEG или PNG).";
  }
  return "Модель не смогла обработать эту пару фото. Попробуйте другое фото или другую вещь.";
}

async function fashnFetch(
  path: string,
  apiKey: string,
  init: RequestInit,
  signal: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (cause) {
    if (signal.aborted) {
      throw new TryOnError("Генерация заняла слишком много времени. Попробуйте ещё раз.", 504, cause);
    }
    throw new TryOnError("Сервис примерки недоступен. Попробуйте позже.", 503, cause);
  }

  const body = await response.text();
  const parsed: unknown = body ? safeJson(body) : null;

  if (!response.ok) {
    const detail = readError((parsed as RunResponse | null)?.error) ?? body.slice(0, 200);
    // 401/403: wrong or revoked key. 402: out of credits. Both are owner problems,
    // so the visitor gets a neutral message while the detail goes to the log.
    if (response.status === 401 || response.status === 403) {
      throw new TryOnError("Сервис примерки не настроен. Обратитесь к администратору.", 503, detail);
    }
    if (response.status === 402) {
      throw new TryOnError("Закончились кредиты на генерацию. Обратитесь к администратору.", 503, detail);
    }
    if (response.status === 429) {
      throw new TryOnError("Сейчас слишком много запросов. Подождите минуту и попробуйте снова.", 429, detail);
    }
    throw new TryOnError(userFacingError(detail), 502, detail);
  }

  return parsed;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new TryOnError("Генерация заняла слишком много времени. Попробуйте ещё раз.", 504));
      },
      { once: true },
    );
  });

export function createFashnProvider(apiKey: string): TryOnProvider {
  return {
    name: "FASHN AI",
    model: MODEL_NAME,
    isDemo: false,

    async run(request: TryOnRequest, outerSignal?: AbortSignal): Promise<TryOnResult> {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS);
      outerSignal?.addEventListener("abort", () => controller.abort(), { once: true });

      try {
        const submitted = (await fashnFetch("/run", apiKey, {
          method: "POST",
          body: JSON.stringify({
            model_name: MODEL_NAME,
            inputs: {
              model_image: request.personImage,
              garment_image: request.garmentImage,
              category: request.category,
              mode: request.mode ?? "balanced",
              num_samples: 1,
              output_format: "jpeg",
            },
          }),
        }, controller.signal)) as RunResponse | null;

        const predictionId = submitted?.id;
        if (!predictionId) {
          const detail = readError(submitted?.error) ?? "no prediction id in response";
          throw new TryOnError(userFacingError(detail), 502, detail);
        }

        while (true) {
          const status = (await fashnFetch(`/run/${predictionId}`, apiKey, {
            method: "GET",
          }, controller.signal)) as StatusResponse | null;

          if (status?.status === "completed") {
            const imageUrl = status.output?.[0];
            if (!imageUrl) {
              throw new TryOnError("Модель вернула пустой результат. Попробуйте ещё раз.", 502);
            }
            return {
              imageUrl,
              provider: "FASHN AI",
              model: MODEL_NAME,
              elapsedMs: Date.now() - startedAt,
              demo: false,
            };
          }

          if (status?.status === "failed") {
            const detail = readError(status.error) ?? "prediction failed";
            throw new TryOnError(userFacingError(detail), 502, detail);
          }

          await sleep(POLL_INTERVAL_MS, controller.signal);
        }
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

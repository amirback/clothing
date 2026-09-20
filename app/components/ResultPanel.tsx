"use client";

import type { TryOnResult } from "@/lib/tryon/types";

type Props = {
  status: "idle" | "loading" | "done" | "error";
  result: TryOnResult | null;
  error: string | null;
  elapsedSeconds: number;
  onRetry: () => void;
};

/** Download a result: CDN images go through our proxy, data URIs go direct. */
function downloadHref(imageUrl: string): string {
  return imageUrl.startsWith("data:")
    ? imageUrl
    : `/api/download?url=${encodeURIComponent(imageUrl)}`;
}

function fileName(result: TryOnResult): string {
  const extension = result.imageUrl.startsWith("data:image/svg") ? "svg" : "jpg";
  return `primerka-${extension === "svg" ? "demo" : Date.now()}.${extension}`;
}

export function ResultPanel({ status, result, error, elapsedSeconds, onRetry }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        {status === "idle" && (
          <p className="max-w-60 px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Здесь появится результат примерки
          </p>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <span
              className="size-10 animate-spin rounded-full border-3 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
              role="progressbar"
              aria-label="Генерация примерки"
            />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Примеряем…</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {elapsedSeconds} с — обычно занимает 10–30 секунд
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {status === "done" && result && (
          // Generated images are remote/data URIs outside next/image's control.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.imageUrl} alt="Результат примерки" className="h-full w-full object-contain" />
        )}
      </div>

      {status === "done" && result && (
        <div className="flex flex-col gap-2">
          <a
            href={downloadHref(result.imageUrl)}
            download={fileName(result)}
            className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Скачать результат
          </a>
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            {result.demo
              ? "Демо-режим: AI-модель не подключена."
              : `Готово за ${(result.elapsedMs / 1000).toFixed(1)} с · ${result.provider}`}
          </p>
        </div>
      )}
    </div>
  );
}

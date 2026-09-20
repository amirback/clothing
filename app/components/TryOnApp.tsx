"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogItem } from "@/lib/catalog";
import type { GarmentCategory, TryOnResult } from "@/lib/tryon/types";
import { CatalogPicker } from "./CatalogPicker";
import { PhotoUploader } from "./PhotoUploader";
import { ResultPanel } from "./ResultPanel";

type CatalogEntry = CatalogItem & { src: string };
type GarmentSource = "catalog" | "upload";
type Status = "idle" | "loading" | "done" | "error";

const CATEGORY_OPTIONS: { value: GarmentCategory; label: string }[] = [
  { value: "auto", label: "Определить автоматически" },
  { value: "tops", label: "Верх (футболка, рубашка, худи)" },
  { value: "bottoms", label: "Низ (джинсы, юбка, шорты)" },
  { value: "one-pieces", label: "Платье / комбинезон" },
];

export function TryOnApp({ catalog }: { catalog: readonly CatalogEntry[] }) {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [garmentSource, setGarmentSource] = useState<GarmentSource>("catalog");
  const [catalogId, setCatalogId] = useState<string | null>(catalog[0]?.id ?? null);
  const [garmentUpload, setGarmentUpload] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<GarmentCategory>("auto");

  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Live counter next to the spinner, so a slow generation never looks stuck.
  useEffect(() => {
    if (status !== "loading") return;
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Drop the in-flight request if the component goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  const garmentReady = garmentSource === "catalog" ? Boolean(catalogId) : Boolean(garmentUpload);
  const canSubmit = Boolean(personImage) && garmentReady && status !== "loading";

  async function runTryOn() {
    if (!canSubmit || !personImage) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);
    setResult(null);
    setElapsedSeconds(0);
    // On mobile the result sits below the form; bring it into view.
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));

    try {
      const response = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(
          garmentSource === "catalog"
            ? { personImage, garmentId: catalogId }
            : { personImage, garmentImage: garmentUpload, category: uploadCategory },
        ),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Не удалось выполнить примерку.";
        setError(message);
        setStatus("error");
        return;
      }

      setResult(payload as TryOnResult);
      setStatus("done");
    } catch {
      if (controller.signal.aborted) return;
      setError("Нет связи с сервером. Проверьте интернет и попробуйте снова.");
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <Step n={1} /> Ваше фото
          </h2>
          <div className="max-w-64">
            <PhotoUploader
              label="Фото человека"
              hint="Лучше всего: в полный рост или по пояс, анфас, на светлом фоне."
              value={personImage}
              onChange={setPersonImage}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <Step n={2} /> Вещь
          </h2>

          <div className="flex w-fit gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            <TabButton active={garmentSource === "catalog"} onClick={() => setGarmentSource("catalog")}>
              Из каталога
            </TabButton>
            <TabButton active={garmentSource === "upload"} onClick={() => setGarmentSource("upload")}>
              Своё фото
            </TabButton>
          </div>

          {garmentSource === "catalog" ? (
            <CatalogPicker items={catalog} selectedId={catalogId} onSelect={setCatalogId} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="max-w-48">
                <PhotoUploader
                  label="Фото одежды"
                  hint="Вещь целиком на однотонном фоне (как в интернет-магазине)."
                  value={garmentUpload}
                  onChange={setGarmentUpload}
                  aspect="square"
                />
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Тип вещи</span>
                <select
                  value={uploadCategory}
                  onChange={(event) => setUploadCategory(event.target.value as GarmentCategory)}
                  className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void runTryOn()}
            disabled={!canSubmit}
            className="w-full max-w-sm rounded-xl bg-zinc-900 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {status === "loading" ? "Примеряем…" : "Примерить"}
          </button>
          {!personImage && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Сначала загрузите своё фото.</p>
          )}
        </section>
      </div>

      <div ref={resultRef} className="flex flex-col gap-3 lg:sticky lg:top-8 lg:self-start">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <Step n={3} /> Результат
        </h2>
        <ResultPanel
          status={status}
          result={result}
          error={error}
          elapsedSeconds={elapsedSeconds}
          onRetry={() => void runTryOn()}
        />
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
      {n}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

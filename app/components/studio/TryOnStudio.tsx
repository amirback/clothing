"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogItem } from "@/lib/catalog";
import { format, type Dictionary } from "@/lib/i18n";
import type { GarmentCategory, TryOnResult } from "@/lib/tryon/types";
import { CatalogGrid } from "./CatalogGrid";
import { PhotoDropzone } from "./PhotoDropzone";
import { ResultStage, type StageStatus } from "./ResultStage";

type Entry = CatalogItem & { src: string; name: string };
type GarmentSource = "catalog" | "upload";
type ApiError = { code?: string; params?: Record<string, string | number> };

const UPLOAD_CATEGORIES: GarmentCategory[] = ["auto", "tops", "bottoms", "one-pieces"];

export function TryOnStudio({
  dict,
  catalog,
  demoMode,
}: {
  dict: Dictionary;
  catalog: readonly Entry[];
  demoMode: boolean;
}) {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [garmentSource, setGarmentSource] = useState<GarmentSource>("catalog");
  const [catalogId, setCatalogId] = useState<string | null>(catalog[0]?.id ?? null);
  const [garmentUpload, setGarmentUpload] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<GarmentCategory>("auto");

  const [status, setStatus] = useState<StageStatus>("idle");
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  /** The photo the result was produced from — keeps the comparison honest if the user swaps photos afterwards. */
  const [comparedPerson, setComparedPerson] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const garmentRef = useRef<HTMLElement>(null);

  // Live counter beside the spinner, so a slow generation never looks stuck.
  useEffect(() => {
    if (status !== "loading") return;
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const garmentReady = garmentSource === "catalog" ? Boolean(catalogId) : Boolean(garmentUpload);
  const canSubmit = Boolean(personImage) && garmentReady && status !== "loading";

  function translateError(payload: ApiError): string {
    const code = payload.code;
    const known = code && code in dict.errors ? (code as keyof Dictionary["errors"]) : "UNKNOWN";
    return format(dict.errors[known], payload.params ?? {});
  }

  async function runTryOn() {
    if (!canSubmit || !personImage) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorText(null);
    setResult(null);
    setElapsedSeconds(0);
    setComparedPerson(personImage);
    // On narrow screens the result sits below the form; bring it into view.
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
        setErrorText(translateError((payload ?? {}) as ApiError));
        setStatus("error");
        return;
      }

      setResult(payload as TryOnResult);
      setStatus("done");
    } catch {
      if (controller.signal.aborted) return;
      setErrorText(dict.errors.NETWORK);
      setStatus("error");
    }
  }

  return (
    <section id="studio" className="scroll-mt-24 border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="reveal mb-10 flex flex-col gap-3">
          <h2 className="section-title text-[clamp(1.75rem,3.6vw,2.6rem)]">{dict.studio.title}</h2>
          <p className="lede max-w-xl">{dict.studio.subtitle}</p>
          {demoMode && (
            <p className="mt-1 flex w-fit items-start gap-2 rounded-card border border-line-strong bg-sunken px-3.5 py-2.5 text-xs font-medium text-ink-soft">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-accent" />
              {dict.studio.demoBanner}
            </p>
          )}
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14">
          <div className="flex flex-col gap-10">
            <Step index={1} label={dict.studio.stepLabel} title={dict.studio.person.title}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
                <div className="w-full max-w-60 shrink-0">
                  <PhotoDropzone
                    dict={dict}
                    label={dict.studio.person.label}
                    hint={dict.studio.person.hint}
                    value={personImage}
                    onChange={setPersonImage}
                  />
                </div>

                <div className="flex flex-col gap-3 rounded-panel border border-line bg-sunken p-5 sm:max-w-xs">
                  <p className="text-sm font-semibold tracking-tight">{dict.studio.person.tipsTitle}</p>
                  <ul className="flex flex-col gap-2.5">
                    {[dict.studio.person.tip1, dict.studio.person.tip2, dict.studio.person.tip3, dict.studio.person.tip4].map((tip) => (
                      <li key={tip} className="flex items-start gap-2.5 text-sm text-ink-soft">
                        <CheckIcon />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Step>

            <Step index={2} label={dict.studio.stepLabel} title={dict.studio.garment.title} ref={garmentRef}>
              <div className="flex flex-col gap-4">
                <div className="flex w-fit gap-1 rounded-full bg-sunken p-1" role="group" aria-label={dict.studio.garment.title}>
                  <Tab active={garmentSource === "catalog"} onClick={() => setGarmentSource("catalog")}>
                    {dict.studio.garment.tabCatalog}
                  </Tab>
                  <Tab active={garmentSource === "upload"} onClick={() => setGarmentSource("upload")}>
                    {dict.studio.garment.tabUpload}
                  </Tab>
                </div>

                {garmentSource === "catalog" ? (
                  <CatalogGrid dict={dict} items={catalog} selectedId={catalogId} onSelect={setCatalogId} />
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="w-44 shrink-0">
                      <PhotoDropzone
                        dict={dict}
                        label={dict.studio.garment.label}
                        hint={dict.studio.garment.hint}
                        value={garmentUpload}
                        onChange={setGarmentUpload}
                        aspect="square"
                      />
                    </div>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-semibold">{dict.studio.garment.categoryLabel}</span>
                      <select
                        value={uploadCategory}
                        onChange={(event) => setUploadCategory(event.target.value as GarmentCategory)}
                        className="w-full max-w-xs rounded-card border border-line-strong bg-surface px-3 py-2.5 text-sm transition-colors hover:border-ink-muted"
                      >
                        {UPLOAD_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {dict.categories[category]}
                          </option>
                        ))}
                      </select>
                      {uploadCategory !== "auto" && (
                        <span className="text-xs text-ink-muted">{dict.categoryHints[uploadCategory]}</span>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </Step>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void runTryOn()}
                disabled={!canSubmit}
                className="btn btn-primary h-13 w-full max-w-xs px-8 text-base"
              >
                {status === "loading" ? dict.studio.submitting : dict.studio.submit}
              </button>
              {!personImage && <p className="text-xs text-ink-muted">{dict.studio.needPerson}</p>}
              {personImage && !garmentReady && <p className="text-xs text-ink-muted">{dict.studio.needGarment}</p>}
            </div>
          </div>

          <div ref={resultRef} className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <Step index={3} label={dict.studio.stepLabel} title={dict.studio.result.title}>
              <ResultStage
                dict={dict}
                status={status}
                result={result}
                personImage={comparedPerson}
                errorText={errorText}
                elapsedSeconds={elapsedSeconds}
                onRetry={() => void runTryOn()}
                onTryAnother={() => {
                  setStatus("idle");
                  setResult(null);
                  setErrorText(null);
                  garmentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            </Step>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  index,
  label,
  title,
  children,
  ref,
}: {
  index: number;
  label: string;
  title: string;
  children: React.ReactNode;
  ref?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={ref} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper"
        >
          {index}
        </span>
        <h3 className="text-base font-semibold tracking-tight">
          <span className="sr-only">
            {label} {index}:{" "}
          </span>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true">
      <path d="m4.5 10.5 3.2 3.2L15.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tab({
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
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
        active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

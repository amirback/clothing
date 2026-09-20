"use client";

import { format, type Dictionary } from "@/lib/i18n";
import type { TryOnResult } from "@/lib/tryon/types";
import { CompareSlider } from "./CompareSlider";

export type StageStatus = "idle" | "loading" | "done" | "error";

type Props = {
  dict: Dictionary;
  status: StageStatus;
  result: TryOnResult | null;
  personImage: string | null;
  errorText: string | null;
  elapsedSeconds: number;
  onRetry: () => void;
};

/** CDN results go through our proxy to force a download; data URIs go direct. */
function downloadHref(imageUrl: string): string {
  return imageUrl.startsWith("data:") ? imageUrl : `/api/download?url=${encodeURIComponent(imageUrl)}`;
}

function fileName(result: TryOnResult): string {
  const extension = result.imageUrl.startsWith("data:image/svg") ? "svg" : "jpg";
  return `try-on-${Date.now()}.${extension}`;
}

export function ResultStage({
  dict,
  status,
  result,
  personImage,
  errorText,
  elapsedSeconds,
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {status === "done" && result && personImage ? (
        <div className="pop-in">
          <CompareSlider
            before={personImage}
            after={result.imageUrl}
            beforeLabel={dict.studio.result.before}
            afterLabel={dict.studio.result.after}
            hint={dict.studio.result.compareHint}
          />
        </div>
      ) : (
        <div className="relative flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-panel border border-line bg-sunken">
          {status === "idle" && (
            <div className="flex flex-col items-center gap-3 px-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-surface text-ink-muted shadow-sm">
                <SparkIcon />
              </span>
              <p className="text-sm font-medium text-ink-soft">{dict.studio.result.empty}</p>
              <p className="text-xs text-ink-muted">{dict.studio.result.emptyHint}</p>
            </div>
          )}

          {status === "loading" && (
            <>
              <span className="shimmer absolute inset-0" />
              <div className="relative flex flex-col items-center gap-3 px-8 text-center">
                <ProgressRing />
                <p className="text-sm font-semibold">{dict.studio.result.loading}</p>
                <p className="text-xs text-ink-muted">
                  {format(dict.studio.result.elapsed, { seconds: elapsedSeconds })} ·{" "}
                  {dict.studio.result.loadingHint}
                </p>
              </div>
            </>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 px-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                <AlertIcon />
              </span>
              <p className="max-w-64 text-sm text-ink-soft">{errorText}</p>
              <button type="button" onClick={onRetry} className="btn btn-ghost h-10 px-5 text-sm">
                {dict.studio.result.retry}
              </button>
            </div>
          )}
        </div>
      )}

      {status === "done" && result && (
        <div className="pop-in flex flex-col gap-2.5">
          <a
            href={downloadHref(result.imageUrl)}
            download={fileName(result)}
            className="btn btn-primary h-12 w-full text-[15px]"
          >
            <DownloadIcon />
            {dict.studio.result.download}
          </a>
          <p className="text-center text-xs text-ink-muted">
            {result.demo
              ? dict.studio.result.demoNote
              : format(dict.studio.result.doneIn, { seconds: (result.elapsedMs / 1000).toFixed(1) })}
          </p>
        </div>
      )}
    </div>
  );
}

function ProgressRing() {
  return (
    <span className="relative flex size-12 items-center justify-center" role="progressbar" aria-label="…">
      <svg viewBox="0 0 48 48" className="size-12 animate-spin" aria-hidden="true">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" className="text-line-strong" />
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="126"
          strokeDashoffset="88"
          className="text-ink"
        />
      </svg>
    </span>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13 4.5 11l5.6-2L12 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5v5.2M12 16.2h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4.5" aria-hidden="true">
      <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

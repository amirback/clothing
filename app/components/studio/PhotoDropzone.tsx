"use client";

import { useId, useRef, useState } from "react";
import { ImagePrepareError, prepareImage } from "@/lib/client/image";
import { format, type Dictionary } from "@/lib/i18n";

type Props = {
  dict: Dictionary;
  label: string;
  hint: string;
  value: string | null;
  onChange: (dataUri: string | null) => void;
  aspect?: "portrait" | "square";
};

export function PhotoDropzone({ dict, label, hint, value, onChange, aspect = "portrait" }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<{ code: keyof Dictionary["errors"]; params: Record<string, string | number> } | null>(null);
  const [dragging, setDragging] = useState(false);

  async function accept(file: File | undefined) {
    if (!file) return;
    setErrorCode(null);
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      onChange(prepared.dataUri);
    } catch (cause) {
      setErrorCode(
        cause instanceof ImagePrepareError
          ? { code: cause.code, params: cause.params }
          : { code: "UNKNOWN", params: {} },
      );
    } finally {
      setBusy(false);
      // Reset so picking the same file twice still fires a change event.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void accept(event.dataTransfer.files[0]);
        }}
        className={`group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-panel border-2 border-dashed bg-sunken transition-all duration-200 ${
          aspect === "portrait" ? "aspect-3/4" : "aspect-square"
        } ${
          dragging
            ? "border-accent bg-accent-soft"
            : value
              ? "border-transparent"
              : "border-line-strong hover:border-ink-muted hover:bg-surface"
        }`}
      >
        {value ? (
          <>
            {/* A data URI cannot go through next/image optimisation. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/65 to-transparent px-3 pt-8 pb-3 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <UploadIcon />
              {dict.studio.person.change}
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 px-5 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-surface shadow-sm transition-transform duration-200 group-hover:scale-105">
              {busy ? <SpinnerIcon /> : <UploadIcon />}
            </span>
            <span className="text-sm font-medium text-ink-soft">
              {busy ? dict.studio.person.processing : dict.studio.person.empty}
            </span>
          </span>
        )}

        {busy && value && <span className="shimmer absolute inset-0 opacity-70" />}
      </label>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        onChange={(event) => void accept(event.target.files?.[0])}
      />

      <div className="flex items-start justify-between gap-3">
        <p className="text-xs leading-snug text-ink-muted">
          {errorCode ? (
            <span className="text-accent">{format(dict.errors[errorCode.code], errorCode.params)}</span>
          ) : (
            hint
          )}
        </p>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setErrorCode(null);
            }}
            className="shrink-0 text-xs font-medium text-ink-muted underline underline-offset-2 transition-colors hover:text-ink"
          >
            {dict.studio.person.remove}
          </button>
        )}
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

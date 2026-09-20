"use client";

import { useId, useRef, useState } from "react";
import { ImagePrepareError, prepareImage } from "@/lib/client/image";

type Props = {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (dataUri: string | null) => void;
  /** Aspect ratio of the preview box; portrait for people, square for garments. */
  aspect?: "portrait" | "square";
};

export function PhotoUploader({ label, hint, value, onChange, aspect = "portrait" }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function accept(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      onChange(prepared.dataUri);
    } catch (cause) {
      setError(cause instanceof ImagePrepareError ? cause.message : "Не удалось загрузить фото.");
    } finally {
      setBusy(false);
      // Reset so picking the same file twice still fires a change event.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const frameClass = aspect === "portrait" ? "aspect-3/4" : "aspect-square";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Удалить
          </button>
        )}
      </div>

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
        className={`relative flex ${frameClass} w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-zinc-50 transition-colors dark:bg-zinc-900 ${
          dragging
            ? "border-zinc-900 dark:border-zinc-100"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
      >
        {value ? (
          // Data URIs cannot go through next/image optimisation.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {busy ? "Обработка…" : "Нажмите или перетащите фото"}
          </span>
        )}
        {busy && <span className="absolute inset-0 animate-pulse bg-white/40 dark:bg-black/40" />}
      </label>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        onChange={(event) => void accept(event.target.files?.[0])}
      />

      {hint && !error && <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

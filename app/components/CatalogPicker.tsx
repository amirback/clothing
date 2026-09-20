"use client";

import Image from "next/image";
import { CATALOG_CATEGORY_LABELS, type CatalogItem } from "@/lib/catalog";

type Props = {
  items: readonly (CatalogItem & { src: string })[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function CatalogPicker({ items, selectedId, onSelect }: Props) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selected}
              title={`${item.name} — ${CATALOG_CATEGORY_LABELS[item.category]}`}
              className={`group flex w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition-colors dark:bg-zinc-900 ${
                selected
                  ? "border-zinc-900 ring-2 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              }`}
            >
              <span className="relative block aspect-square w-full bg-zinc-50 dark:bg-zinc-950">
                <Image
                  src={item.src}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 33vw, 160px"
                  className="object-contain p-1"
                />
              </span>
              <span className="truncate px-2 py-1.5 text-[11px] leading-tight text-zinc-700 dark:text-zinc-300">
                {item.name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

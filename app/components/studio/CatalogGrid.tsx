"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CATALOG_CATEGORIES, type CatalogCategory, type CatalogItem } from "@/lib/catalog";
import type { Dictionary } from "@/lib/i18n";

type Entry = CatalogItem & { src: string; name: string };

type Props = {
  dict: Dictionary;
  items: readonly Entry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function CatalogGrid({ dict, items, selectedId, onSelect }: Props) {
  const [filter, setFilter] = useState<CatalogCategory | "all">("all");

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.category === filter)),
    [items, filter],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={dict.studio.garment.categoryLabel}>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          {dict.studio.garment.filterAll}
        </FilterChip>
        {CATALOG_CATEGORIES.map((category) => (
          <FilterChip key={category} active={filter === category} onClick={() => setFilter(category)}>
            {dict.categories[category]}
          </FilterChip>
        ))}
      </div>

      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
        {visible.map((item) => {
          const selected = item.id === selectedId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-pressed={selected}
                className={`tile group relative flex w-full flex-col overflow-hidden rounded-card border bg-surface text-left ${
                  selected ? "border-ink ring-2 ring-ink" : "border-line hover:border-line-strong"
                }`}
              >
                <span className="relative block aspect-3/4 w-full overflow-hidden bg-sunken">
                  <Image
                    src={item.src}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 140px"
                    className="object-cover"
                  />
                  {selected && (
                    <span className="pop-in absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-paper shadow-md">
                      <CheckIcon />
                    </span>
                  )}
                </span>
                <span className="truncate px-2 py-2 text-[11px] leading-tight font-medium text-ink-soft">
                  {item.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilterChip({
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
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-line-strong bg-surface text-ink-soft hover:border-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-3.5" aria-hidden="true">
      <path d="m5 10.5 3.2 3.2L15 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

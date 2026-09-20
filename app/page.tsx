import { TryOnApp } from "@/app/components/TryOnApp";
import { CATALOG, catalogImagePath } from "@/lib/catalog";

export default function Home() {
  const catalog = CATALOG.map((item) => ({ ...item, src: catalogImagePath(item) }));
  const demoMode = !process.env.FASHN_API_KEY?.trim();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-col gap-2 sm:mb-12">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Виртуальная примерочная
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
          Загрузите своё фото, выберите вещь — и посмотрите, как она будет выглядеть на вас.
          Фото обрабатываются только во время примерки и не сохраняются на сервере.
        </p>
        {demoMode && (
          <p className="mt-2 w-fit rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Демо-режим: AI-модель не подключена, результат — это заглушка с водяным знаком.
          </p>
        )}
      </header>

      <TryOnApp catalog={catalog} />

      <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:mt-16 dark:border-zinc-800 dark:text-zinc-400">
        <p>
          Результат создаётся AI и является приблизительной визуализацией: посадка, мелкие детали и
          принты могут отличаться от реальной вещи.
        </p>
      </footer>
    </main>
  );
}

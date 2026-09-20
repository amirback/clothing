import { notFound } from "next/navigation";
import { Faq } from "@/app/components/Faq";
import { Hero } from "@/app/components/Hero";
import { HowItWorks } from "@/app/components/HowItWorks";
import { RevealOnScroll } from "@/app/components/RevealOnScroll";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { TryOnStudio } from "@/app/components/studio/TryOnStudio";
import { CATALOG, catalogImagePath } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/config";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const catalog = CATALOG.map((item) => ({
    ...item,
    src: catalogImagePath(item),
    name: dict.items[item.id as keyof typeof dict.items] ?? item.id,
  }));
  const demoMode = !process.env.FASHN_API_KEY?.trim();

  return (
    <>
      <a
        href="#studio"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        {dict.nav.skipToContent}
      </a>

      <RevealOnScroll />
      <SiteHeader dict={dict} locale={locale} />

      <main>
        <Hero dict={dict} />
        <TryOnStudio dict={dict} catalog={catalog} demoMode={demoMode} />
        <HowItWorks dict={dict} />
        <Faq dict={dict} />
      </main>

      <SiteFooter dict={dict} locale={locale} />
    </>
  );
}

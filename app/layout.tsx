import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Cyrillic subset: the interface is in Russian.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Виртуальная примерочная",
  description:
    "Загрузите своё фото и фото одежды — AI покажет, как вещь будет выглядеть на вас.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">{children}</body>
    </html>
  );
}

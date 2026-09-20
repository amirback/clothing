import type { TryOnProvider, TryOnRequest, TryOnResult } from "./types";

/**
 * Offline stub used when no API key is configured.
 *
 * It does not run a model: it composes the two uploaded images into a labelled
 * preview so the whole flow (upload -> generate -> show -> download) can be
 * developed, demoed and tested without spending credits. Every result is
 * watermarked so it can never be mistaken for a real try-on.
 */

const WIDTH = 900;
const HEIGHT = 1200;

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function createDemoProvider(): TryOnProvider {
  return {
    name: "Демо-режим",
    model: "demo-composite",
    isDemo: true,

    async run(request: TryOnRequest): Promise<TryOnResult> {
      const startedAt = Date.now();
      // Imitates the latency of a real generation so the loading indicator,
      // cancellation and timeouts can be tested honestly.
      await new Promise((resolve) => setTimeout(resolve, 2_500));

      const person = escapeXml(request.personImage);
      const garment = escapeXml(request.garmentImage);

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <clipPath id="frame"><rect width="${WIDTH}" height="${HEIGHT}"/></clipPath>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f4f4f5"/>
  <g clip-path="url(#frame)">
    <image href="${person}" width="${WIDTH}" height="${HEIGHT}" preserveAspectRatio="xMidYMid meet"/>
  </g>
  <g transform="translate(${WIDTH - 250} ${HEIGHT - 250})">
    <rect x="-10" y="-10" width="230" height="230" rx="16" fill="#ffffff" opacity="0.92"/>
    <image href="${garment}" x="0" y="0" width="210" height="210" preserveAspectRatio="xMidYMid meet"/>
  </g>
  <rect x="0" y="0" width="${WIDTH}" height="86" fill="#111827" opacity="0.88"/>
  <text x="32" y="56" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="bold" fill="#ffffff">
    ДЕМО-РЕЖИМ — AI не подключён
  </text>
  <text x="32" y="${HEIGHT - 32}" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#111827" opacity="0.75">
    Добавьте FASHN_API_KEY, чтобы получить настоящую примерку
  </text>
</svg>`;

      return {
        imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
        provider: "Демо-режим",
        model: "demo-composite",
        elapsedMs: Date.now() - startedAt,
        demo: true,
      };
    },
  };
}

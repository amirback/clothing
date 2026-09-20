/**
 * GET /api/download?url=... — streams a generated image back as a file download.
 *
 * Needed because the result lives on the provider's CDN: a plain link would
 * open in a tab (no `Content-Disposition`) and a client-side fetch would be
 * blocked by CORS. The host allowlist keeps this from becoming an open proxy.
 */

export const runtime = "nodejs";

const ALLOWED_HOSTS = (process.env.DOWNLOAD_ALLOWED_HOSTS ?? "cdn.fashn.ai,fashn.ai,api.fashn.ai")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

function isAllowed(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return Response.json({ error: "Не указан адрес изображения." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return Response.json({ error: "Некорректный адрес изображения." }, { status: 400 });
  }

  if (!isAllowed(target)) {
    return Response.json({ error: "Этот адрес нельзя скачать." }, { status: 400 });
  }

  const upstream = await fetch(target, { signal: request.signal, cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Не удалось скачать изображение." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="tryon-${Date.now()}.${extension}"`,
      "Cache-Control": "no-store",
    },
  });
}

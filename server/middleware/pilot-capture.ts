/**
 * Founding-pilot card + hold-up QR. Submissions are /api/pilot.
 */
import cardHtml from "../../public/card.html?raw";
import qrHtml from "../../public/qr.html?raw";
import deskHtml from "../../public/desk.html?raw";

function which(path: string): "card" | "qr" | "desk" | null {
  if (path === "/card" || path === "/pilot" || path === "/card.html") return "card";
  if (path === "/qr" || path === "/qr.html" || /^\/qr\/[a-z0-9-]{1,24}$/i.test(path)) return "qr";
  if (path === "/desk" || path === "/desk.html") return "desk";
  return null;
}

export default async function pilotCapture(
  event: { url: URL; req: { method: string; headers: Headers } },
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  const path = event.url.pathname;
  const kind = which(path);
  if (!kind || (method !== "GET" && method !== "HEAD")) return next();

  const headers = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };
  if (method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(kind === "qr" ? qrHtml : kind === "desk" ? deskHtml : cardHtml, {
    status: 200,
    headers,
  });
}
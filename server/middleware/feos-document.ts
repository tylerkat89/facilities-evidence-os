/**
 * `/pilot` is the frozen landing card. Floor is /feos.html and requires a walkthrough cookie.
 */
import cardHtml from "../../public/card.html?raw";
import feosHtml from "../../public/feos.html?raw";
import qrHtml from "../../public/qr.html?raw";
import deskHtml from "../../public/desk.html?raw";
import lockedHtml from "../../public/demo-locked.html?raw";
import {
  issueWalkToken,
  validWalkToken,
  walkCookieFromHeader,
  walkSetCookie,
} from "../../src/lib/demo-walk.server";

function whichDoc(path: string): "qr" | "card" | "feos" | "desk" | "demo" | "locked" | null {
  if (path === "/" || path === "/index.html" || path === "/card" || path === "/pilot" || path === "/card.html") {
    return "card";
  }
  if (path === "/qr" || path === "/qr.html" || /^\/qr\/[a-z0-9-]{1,24}$/i.test(path)) return "qr";
  if (path === "/desk" || path === "/desk.html") return "desk";
  if (path === "/demo") return "demo";
  if (path === "/feos.html") return "feos";
  if (path.toLowerCase() === "/facilities-evidence-os.html") return "locked";
  return null;
}

export default async function feosDocument(
  event: { url: URL; req: { method: string; headers: Headers } },
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  const path = event.url.pathname;
  const doc = whichDoc(path);
  if (!doc || (method !== "GET" && method !== "HEAD")) return next();

  if (doc === "locked") {
    return new Response("Not found", {
      status: 404,
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  }

  if (doc === "demo") {
    const https = event.url.protocol === "https:";
    const token = issueWalkToken();
    return new Response(null, {
      status: 302,
      headers: {
        location: "/feos.html",
        "set-cookie": walkSetCookie(token, https),
        "cache-control": "no-store",
      },
    });
  }

  const headers: Record<string, string> = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };
  if (method === "HEAD") return new Response(null, { status: 200, headers });
  const allowed = validWalkToken(walkCookieFromHeader(event.req.headers.get("cookie")));
  const html =
    doc === "qr"
      ? qrHtml
      : doc === "desk"
        ? deskHtml
        : doc === "feos"
          ? allowed
            ? feosHtml
            : lockedHtml
          : cardHtml;
  return new Response(html, { status: 200, headers });
}
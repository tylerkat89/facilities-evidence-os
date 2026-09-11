import { randomBytes } from "node:crypto";

const TTL_MS = 4 * 60 * 60 * 1000;
const tokens = new Map<string, number>();
const hits = new Map<string, number[]>();
const HIT_WINDOW_MS = 10 * 60 * 1000;
const HIT_MAX = 20;

function prune(now: number) {
  for (const [token, exp] of tokens) {
    if (exp <= now) tokens.delete(token);
  }
}

export function clientIp(
  headers: { get?(name: string): string | null } | Record<string, unknown> | undefined,
): string {
  if (!headers) return "unknown";
  const getter = (headers as { get?: (n: string) => string | null }).get;
  const raw =
    typeof getter === "function"
      ? getter.call(headers, "x-forwarded-for") || getter.call(headers, "x-real-ip") || ""
      : String(
          (headers as Record<string, unknown>)["x-forwarded-for"] ||
            (headers as Record<string, unknown>)["x-real-ip"] ||
            "",
        );
  return String(raw).split(",")[0].trim().slice(0, 64) || "unknown";
}

export function allowWalkIssue(ip: string): boolean {
  const now = Date.now();
  const key = String(ip || "unknown").slice(0, 64);
  const list = (hits.get(key) || []).filter((t) => now - t < HIT_WINDOW_MS);
  if (list.length >= HIT_MAX) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  return true;
}

export function issueWalkToken(): string {
  const now = Date.now();
  prune(now);
  const token = randomBytes(16).toString("hex");
  tokens.set(token, now + TTL_MS);
  return token;
}

export function validWalkToken(value: unknown): boolean {
  const token = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-f0-9]/g, "");
  if (token.length !== 32) return false;
  const now = Date.now();
  const exp = tokens.get(token);
  if (!exp || exp <= now) {
    tokens.delete(token);
    return false;
  }
  return true;
}

export function walkCookieFromHeader(cookieHeader: string | null | undefined): string {
  const m = String(cookieHeader || "").match(/(?:^|;\s*)feos_walk=([a-fA-F0-9]{32})(?:;|$)/);
  return m ? m[1].toLowerCase() : "";
}

export function walkSetCookie(token: string, https: boolean): string {
  return `feos_walk=${token}; Max-Age=14400; Path=/; SameSite=Lax; HttpOnly${https ? "; Secure" : ""}`;
}

export function demoLocationFromSearch(search: string): string {
  const site = String(new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("site") || "");
  if (/^s_[a-f0-9]{32}$/.test(site)) return "/feos.html?site=" + site;
  return "/feos.html";
}

export function isBlockedPublicPath(path: string): boolean {
  const p = path.toLowerCase();
  return (
    p === "/facilities-evidence-os.html" ||
    p === "/facilities-evidence-os.zip" ||
    p === "/facilities-evidence-os-github.zip" ||
    p === "/get-feos.html" ||
    p === "/get-feos" ||
    p === "/feos-scan-to-email.png"
  );
}

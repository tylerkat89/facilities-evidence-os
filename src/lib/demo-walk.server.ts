import { randomBytes } from "node:crypto";

const TTL_MS = 4 * 60 * 60 * 1000;
const tokens = new Map<string, number>();

function prune(now: number) {
  for (const [token, exp] of tokens) {
    if (exp <= now) tokens.delete(token);
  }
}

export function issueWalkToken(): string {
  const now = Date.now();
  prune(now);
  const token = randomBytes(16).toString("hex");
  tokens.set(token, now + TTL_MS);
  return token;
}

export function validWalkToken(value: unknown): boolean {
  const token = String(value ?? "").toLowerCase().replace(/[^a-f0-9]/g, "");
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

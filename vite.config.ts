import { readdirSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";
import {
  issueWalkToken,
  validWalkToken,
  walkCookieFromHeader,
  walkSetCookie,
} from "./src/lib/demo-walk.server";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/**
 * Live-preview OAuth popup — handled HERE so the agent never has to create a
 * `/auth/popup` route (and cannot break it by scaffolding a React page that
 * paints the full app shell in the popup).
 *
 * `signIn` (client.ts) opens `/auth/popup?providerId=…` in a top-level window.
 * This middleware runs before TanStack Start, calls `handleAuthPopupRequest`,
 * and returns the 302 / completion HTML. Deployed apps do not use the popup
 * (full-page OAuth redirect), so `apply: "serve"` is enough.
 */
function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      // Register immediately (not in a returned post-hook) so we run BEFORE
      // TanStack Start / the SPA HTML fallback. A model-authored
      // `src/routes/auth/popup.tsx` React page must never win this path.
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          // Ensure Host is the public preview host so Better Auth's dynamic
          // baseURL / redirect_uri match the popup origin.
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          // Preserve multiple Set-Cookie headers (OAuth state + session).
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

/**
 * Serve the Facilities Evidence OS HTML as `/`.
 * The product is a single patched file in public/feos.html — do not wrap it
 * in an iframe or a parallel React tree.
 */
function feosHtmlPlugin(): Plugin {
  const send = (res: import("node:http").ServerResponse, html: string) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://grok.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob: 'self'; connect-src 'self' https: http://127.0.0.1:* http://localhost:* http://[::1]:*; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; media-src 'none'; frame-ancestors 'self' https://grok.com https://*.grok.com https://*.grok-sandbox.com",
    );
    res.setHeader(
      "Permissions-Policy",
      "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
    );
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.end(html);
  };
  return {
    name: "feos-html",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url ?? "";
        const pathOnly = (raw.split("?", 1)[0] ?? "").toLowerCase();
        const q = (raw.split("?")[1] || "").toLowerCase();
        const budget =
          /(^|\/)(api\/)?budget(s)?(\/|$)/.test(pathOnly) ||
          /\/export\/budget/.test(pathOnly) ||
          /\/budget\/export/.test(pathOnly) ||
          (/\/export(\.xlsx)?$/.test(pathOnly) &&
            /sheet=budget|tab=budget/.test(q));
        if (!budget) {
          next();
          return;
        }
        const claimed = String(req.headers["x-feos-role"] || "")
          .toLowerCase()
          .trim();
        const role =
          claimed === "supervisor" || claimed === "manager" || claimed === "tech"
            ? claimed
            : "tech";
        const rec = JSON.stringify({
          at: new Date().toISOString(),
          kind: "deny",
          status: 403,
          action: `${(req.method || "GET").toUpperCase()} ${pathOnly}`,
          role,
          reason: "budget_forbidden",
        });
        try {
          mkdirSync(join(server.config.root, "artifacts"), { recursive: true });
          appendFileSync(
            join(server.config.root, "artifacts/feos-audit.log"),
            rec + "\n",
          );
        } catch {
          /* ignore log IO */
        }
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(
          JSON.stringify({
            error: "Forbidden",
            kind: "forbidden",
            status: 403,
          }),
        );
      });
      const htmlPath = join(server.config.root, "public/feos.html");
      const cardPath = join(server.config.root, "public/card.html");
      const qrPath = join(server.config.root, "public/qr.html");
      const deskPath = join(server.config.root, "public/desk.html");
      const lockedPath = join(server.config.root, "public/demo-locked.html");
      const hasWalk = (req: import("node:http").IncomingMessage) =>
        validWalkToken(walkCookieFromHeader(String(req.headers.cookie || "")));
      const walkCookie = (req: import("node:http").IncomingMessage) => {
        const xf = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
        const https = xf === "https";
        return walkSetCookie(issueWalkToken(), https);
      };

      const readReq = (req: import("node:http").IncomingMessage) =>
        new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = [];
          req.on("data", (c) => {
            chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
          });
          req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
          req.on("error", reject);
        });

      const sendJson = (
        res: import("node:http").ServerResponse,
        status: number,
        body: unknown,
      ) => {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type, accept");
        res.end(JSON.stringify(body));
      };

      server.middlewares.use(async (req, res, next) => {
        const pathOnly = (req.url ?? "").split("?", 1)[0] ?? "";
        const method = (req.method ?? "GET").toUpperCase();
        if (pathOnly === "/api/pilot" && method === "OPTIONS") {
          res.statusCode = 204;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "content-type, accept");
          res.end();
          return;
        }
        if (pathOnly === "/api/pilot" && method === "POST") {
          try {
            const raw = await readReq(req);
            let data: unknown = {};
            try {
              data = JSON.parse(raw);
            } catch {
              sendJson(res, 400, { error: "Bad request" });
              return;
            }
            const mod = (await server.ssrLoadModule("/src/lib/pilot-leads.server.ts")) as {
              normalizePilotLeadInput: (v: unknown) => {
                name: string;
                company: string;
                email: string;
                phone: string;
                contact: string;
                pain: string;
              };
              validatePilotLeadInput: (v: {
                name: string;
                company: string;
                email: string;
                phone: string;
                contact: string;
                pain: string;
              }) => string | null;
              insertPilotLead: (v: {
                name: string;
                company: string;
                email: string;
                phone: string;
                contact: string;
                pain: string;
              }) => Promise<{ id: number }>;
            };
            const input = mod.normalizePilotLeadInput(data);
            const invalid = mod.validatePilotLeadInput(input);
            if (invalid) {
              sendJson(res, 400, { error: invalid });
              return;
            }
            const lead = await mod.insertPilotLead(input);
            sendJson(res, 200, { ok: true, id: lead.id });
          } catch {
            sendJson(res, 500, { error: "Could not save that." });
          }
          return;
        }
        if (pathOnly === "/api/desk" && method === "POST") {
          try {
            const raw = await readReq(req);
            let data: { email?: unknown } = {};
            try {
              data = JSON.parse(raw);
            } catch {
              sendJson(res, 400, { error: "Bad request" });
              return;
            }
            const mod = (await server.ssrLoadModule("/src/lib/pilot-leads.server.ts")) as {
              isDeskOperator: (v: unknown) => boolean;
              listPilotLeads: () => Promise<unknown[]>;
            };
            if (!mod.isDeskOperator(data.email)) {
              sendJson(res, 403, { error: "Forbidden" });
              return;
            }
            const leads = await mod.listPilotLeads();
            sendJson(res, 200, { ok: true, leads });
          } catch {
            sendJson(res, 500, { error: "Could not read that." });
          }
          return;
        }
        if (
          method === "GET" &&
          (pathOnly === "/card" || pathOnly === "/pilot" || pathOnly === "/card.html")
        ) {
          try {
            const html = readFileSync(cardPath, "utf8");
            send(res, html);
          } catch (err) {
            next(err);
          }
          return;
        }
        if (method === "GET" && (pathOnly === "/qr" || pathOnly === "/qr.html" || /^\/qr\/[a-z0-9-]{1,24}$/i.test(pathOnly))) {
          try {
            const html = readFileSync(qrPath, "utf8");
            send(res, html);
          } catch (err) {
            next(err);
          }
          return;
        }
        if (method === "GET" && (pathOnly === "/desk" || pathOnly === "/desk.html")) {
          try {
            const html = readFileSync(deskPath, "utf8");
            send(res, html);
          } catch (err) {
            next(err);
          }
          return;
        }
        if (method === "GET" && pathOnly.toLowerCase() === "/facilities-evidence-os.html") {
          res.statusCode = 404;
          res.setHeader("Cache-Control", "no-store");
          res.end("Not found");
          return;
        }
        if (method === "GET" && pathOnly === "/demo") {
          res.statusCode = 302;
          res.setHeader("Set-Cookie", walkCookie(req));
          res.setHeader("Location", "/feos.html");
          res.setHeader("Cache-Control", "no-store");
          res.end();
          return;
        }
        if (method === "GET" && pathOnly === "/feos.html") {
          try {
            if (!hasWalk(req)) {
              send(res, readFileSync(lockedPath, "utf8"));
              return;
            }
            const html = readFileSync(htmlPath, "utf8");
            send(res, html);
          } catch (err) {
            next(err);
          }
          return;
        }
        next();
      });
      server.middlewares.use((req, res, next) => {
        const pathOnly = (req.url ?? "").split("?", 1)[0] ?? "";
        if (pathOnly !== "/" && pathOnly !== "/index.html") {
          next();
          return;
        }
        const method = (req.method ?? "GET").toUpperCase();
        if (method !== "GET" && method !== "HEAD") {
          next();
          return;
        }
        try {
          const html = readFileSync(cardPath, "utf8");
          if (method === "HEAD") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
            res.end();
            return;
          }
          send(res, html);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    pgliteBootstrapPlugin(),
    // Before tanstackStart so /auth/popup never falls through to the SPA.
    authPopupPlugin(),
    feosHtmlPlugin(),
    // Dev-only /__app-env, read by scripts/check-auth-invariant.mjs.
    appEnvPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));

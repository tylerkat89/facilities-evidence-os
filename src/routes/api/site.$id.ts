import { createFileRoute } from "@tanstack/react-router";
import {
  isSiteId,
  json,
  readSite,
  roleFromRequest,
  writeSite,
} from "@/lib/facility-sites.server";

export const Route = createFileRoute("/api/site/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const id = String(params.id || "");
        if (!isSiteId(id)) return json({ error: "Not found" }, 404);
        try {
          const site = await readSite(id, roleFromRequest(request));
          if (!site) return json({ error: "Not found" }, 404);
          return json({ ok: true, ...site }, 200);
        } catch (error) {
          console.error("[site] read failed:", error);
          return json({ error: "Could not load that site." }, 500);
        }
      },
      PUT: async ({ request, params }) => {
        const id = String(params.id || "");
        if (!isSiteId(id)) return json({ error: "Not found" }, 404);
        const contentLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(contentLength) && contentLength > 1_000_000) {
          return json({ error: "Property is too large to save." }, 413);
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const payload =
          body && typeof body === "object" && "payload" in (body as object)
            ? (body as { payload: unknown }).payload
            : body;
        try {
          const saved = await writeSite(id, payload, roleFromRequest(request));
          return json({ ok: true, id: saved.id, revision: saved.revision }, 200);
        } catch (error) {
          const status = Number((error as { status?: number }).status) || 500;
          const message = error instanceof Error ? error.message : "Could not save.";
          if (status >= 500) console.error("[site] write failed:", error);
          return json({ error: message.slice(0, 180) }, status);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { createSite, json, requestIp } from "@/lib/facility-sites.server";

export const Route = createFileRoute("/api/site")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let name = "Property";
        try {
          const body = (await request.json()) as { name?: unknown };
          if (typeof body?.name === "string" && body.name.trim()) name = body.name.trim();
        } catch {
          /* name optional */
        }
        try {
          const site = await createSite(name, requestIp(request));
          return json({ ok: true, id: site.id }, 201);
        } catch (error) {
          const status = Number((error as { status?: number }).status) || 500;
          const message =
            status === 429
              ? "Too many sites from here. Try again in a few minutes."
              : "Could not create that site.";
          if (status >= 500) console.error("[site] create failed:", error);
          return json({ error: message }, status);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { isDeskOperator, listPilotLeads } from "@/lib/pilot-leads.server";

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

export const Route = createFileRoute("/api/desk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const email =
          body && typeof body === "object"
            ? (body as { email?: unknown }).email
            : "";
        if (!isDeskOperator(email)) {
          return json({ error: "Forbidden" }, 403);
        }
        try {
          const leads = await listPilotLeads();
          return json({ ok: true, leads }, 200);
        } catch {
          return json({ error: "Could not read that." }, 500);
        }
      },
    },
  },
});

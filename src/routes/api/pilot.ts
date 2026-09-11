import { createFileRoute } from "@tanstack/react-router";
import {
  insertPilotLead,
  normalizePilotLeadInput,
  validatePilotLeadInput,
} from "@/lib/pilot-leads.server";

const MAX_BODY_BYTES = 16 * 1024;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function handlePost({ request }: { request: Request }): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "Request too large" }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const input = normalizePilotLeadInput(body);
  const validationError = validatePilotLeadInput(input);
  if (validationError) return json({ error: validationError }, 400);

  try {
    const lead = await insertPilotLead(input);
    return json({ ok: true, id: lead.id }, 200);
  } catch (error) {
    console.error("[pilot] durable lead write failed:", error);
    return json({ error: "Could not save that." }, 500);
  }
}

export const Route = createFileRoute("/api/pilot")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type, accept",
            "cache-control": "no-store",
          },
        }),
      POST: handlePost,
    },
  },
});

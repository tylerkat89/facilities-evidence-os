import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { allowWalkIssue, clientIp } from "@/lib/demo-walk.server";

export const SITE_ID_RE = /^s_[a-f0-9]{32}$/;
const MAX_JSON = 900_000;

export function isSiteId(value: unknown): value is string {
  return typeof value === "string" && SITE_ID_RE.test(value);
}

export function mintSiteId(): string {
  return "s_" + randomBytes(16).toString("hex");
}

export function roleFromRequest(request: Request): "tech" | "supervisor" | "manager" {
  const claimed = String(request.headers.get("x-feos-role") || "")
    .toLowerCase()
    .trim();
  if (claimed === "supervisor" || claimed === "manager" || claimed === "tech") return claimed;
  return "tech";
}

function clipStr(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

function slimValue(value: unknown, depth: number): unknown {
  if (depth > 8) return null;
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > 12000) return "";
    return value.length > 20000 ? value.slice(0, 20000) : value;
  }
  if (Array.isArray(value)) return value.slice(0, 4000).map((v) => slimValue(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      out[k.slice(0, 80)] = slimValue(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
  return null;
}

export function sanitizePayload(raw: unknown): Record<string, unknown> {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const payload = slimValue(
    {
      buildings: data.buildings,
      levels: data.levels,
      zonesAll: data.zonesAll,
      issues: data.issues,
      recurring: data.recurring,
      vendors: data.vendors,
      inventory: data.inventory,
      budget: data.budget,
      levelId: data.levelId,
      dataset: "blank",
      seq: data.seq,
      zseq: data.zseq,
      lseq: data.lseq,
      bseq: data.bseq,
    },
    0,
  ) as Record<string, unknown>;
  const json = JSON.stringify(payload);
  if (json.length > MAX_JSON) {
    throw new Error("Property is too large to save.");
  }
  return payload;
}

export function stripBudget(payload: Record<string, unknown>): Record<string, unknown> {
  return { ...payload, budget: [] };
}

export async function createSite(name: string, ip: string): Promise<{ id: string }> {
  if (!allowWalkIssue("site:" + ip)) {
    const err = new Error("Too many sites from here. Try again in a few minutes.");
    (err as Error & { status?: number }).status = 429;
    throw err;
  }
  const id = mintSiteId();
  const label = clipStr(name, 120) || "Property";
  const sql = await getSql();
  await sql.query(
    `INSERT INTO facility_sites (id, name) VALUES ($1, $2)`,
    [id, label],
  );
  await sql.query(
    `INSERT INTO facility_snapshots (site_id, payload, revision) VALUES ($1, $2::jsonb, 1)`,
    [id, JSON.stringify({ dataset: "blank", buildings: [], levels: [], zonesAll: {}, issues: [], vendors: [], inventory: [], budget: [], recurring: [] })],
  );
  await sql.query(
    `INSERT INTO facility_ledger (site_id, kind, body) VALUES ($1, $2, $3::jsonb)`,
    [id, "created", JSON.stringify({ name: label })],
  );
  return { id };
}

export async function readSite(id: string, role: "tech" | "supervisor" | "manager") {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    name: string;
    payload: unknown;
    revision: number;
    updated_at: string;
  }>(
    `SELECT s.id, s.name, snap.payload, snap.revision, snap.updated_at::text AS updated_at
     FROM facility_sites s
     JOIN facility_snapshots snap ON snap.site_id = s.id
     WHERE s.id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const payload =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    name: row.name,
    revision: Number(row.revision) || 1,
    updated_at: row.updated_at,
    payload: role === "tech" ? stripBudget(payload) : payload,
  };
}

export async function writeSite(
  id: string,
  rawPayload: unknown,
  role: "tech" | "supervisor" | "manager",
) {
  if (role === "tech") {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  const payload = sanitizePayload(rawPayload);
  const sql = await getSql();
  const exists = await sql.query<{ id: string }>(`SELECT id FROM facility_sites WHERE id = $1`, [id]);
  if (!exists[0]) {
    const err = new Error("Not found");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const updated = await sql.query<{ revision: number }>(
    `UPDATE facility_snapshots
     SET payload = $2::jsonb, revision = revision + 1, updated_at = now()
     WHERE site_id = $1
     RETURNING revision`,
    [id, JSON.stringify(payload)],
  );
  await sql.query(`UPDATE facility_sites SET updated_at = now() WHERE id = $1`, [id]);
  const revision = Number(updated[0]?.revision) || 0;
  await sql.query(
    `INSERT INTO facility_ledger (site_id, kind, body) VALUES ($1, $2, $3::jsonb)`,
    [
      id,
      "snapshot",
      JSON.stringify({
        revision,
        issues: Array.isArray(payload.issues) ? payload.issues.length : 0,
        inventory: Array.isArray(payload.inventory) ? payload.inventory.length : 0,
      }),
    ],
  );
  return { id, revision };
}

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export function requestIp(request: Request): string {
  return clientIp(request.headers);
}

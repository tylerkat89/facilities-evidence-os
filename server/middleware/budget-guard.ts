/**
 * Budget authority is the session role, not the UI.
 * Until a real session store exists, every budget HTTP path is fail-closed 403.
 * A crafted X-FEOS-Role: manager header does not grant access.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

function isBudgetPath(pathname: string, search: string): boolean {
  const p = pathname.toLowerCase();
  const q = search.toLowerCase();
  if (/(^|\/)(api\/)?budget(s)?(\/|$)/.test(p)) return true;
  if (/\/export\/budget/.test(p) || /\/budget\/export/.test(p)) return true;
  if (/\/export(\.xlsx)?$/.test(p) && /sheet=budget|tab=budget/.test(q)) return true;
  if (/\/workbooks?\/budget/.test(p)) return true;
  return false;
}

function roleOf(req: { headers: Headers }): string {
  const claimed = String(req.headers.get("x-feos-role") || "")
    .toLowerCase()
    .trim();
  if (claimed === "supervisor" || claimed === "manager" || claimed === "tech") {
    return claimed;
  }
  return "tech";
}

async function writeAudit(line: string) {
  try {
    const dir = join(process.cwd(), "artifacts");
    await mkdir(dir, { recursive: true });
    await appendFile(join(dir, "feos-audit.log"), line + "\n");
  } catch {
    /* never fail the request because the log disk hiccuped */
  }
}

export default async function budgetGuard(
  event: { url: URL; req: { method: string; headers: Headers } },
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const path = event.url.pathname || "";
  const search = event.url.search || "";
  if (!isBudgetPath(path, search)) return next();

  const role = roleOf(event.req);
  const rec = {
    at: new Date().toISOString(),
    kind: "deny",
    status: 403,
    action: `${(event.req.method || "GET").toUpperCase()} ${path}`,
    role,
    reason: "budget_forbidden",
  };
  await writeAudit(JSON.stringify(rec));

  return new Response(
    JSON.stringify({
      error: "Forbidden",
      kind: "forbidden",
      status: 403,
    }),
    {
      status: 403,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    },
  );
}

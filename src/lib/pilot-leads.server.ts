import { getSql } from "@/lib/db";
import { normalizeReferrer, referrerLabel } from "@/lib/referrers";

export type PilotLeadInput = {
  name: string;
  company: string;
  email: string;
  phone: string;
  contact: string;
  pain: string;
  referred_by: string;
};

export type PilotLead = PilotLeadInput & {
  id: number;
  created_at: string | Date;
};

function clip(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizePilotLeadInput(value: unknown): PilotLeadInput {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const email = clip(data.email ?? data.contact, 120);
  const phone = clip(data.phone, 40);
  return {
    name: clip(data.name, 80),
    company: clip(data.company, 120),
    email,
    phone,
    contact: [email, phone].filter(Boolean).join(" · "),
    pain: clip(data.pain, 400),
    referred_by: normalizeReferrer(data.referred_by ?? data.ref),
  };
}

export function validatePilotLeadInput(input: PilotLeadInput): string | null {
  if (!input.name || !input.company || !input.pain) {
    return "Need name, company, email, phone, and the headache.";
  }
  if (!input.email || input.email.indexOf("@") < 1 || input.email.indexOf(".") < 3) {
    return "Need a real email.";
  }
  if (input.phone.replace(/\D/g, "").length < 10) {
    return "Need a real phone number.";
  }
  return null;
}

/**
 * Persist a founding-pilot lead, then read the inserted row back before the
 * caller is allowed to report success to the browser.
 */
export async function insertPilotLead(input: PilotLeadInput): Promise<PilotLead> {
  const sql = await getSql();
  let inserted: { id: number }[];
  try {
    inserted = await sql.query<{ id: number }>(
      `INSERT INTO pilot_leads (name, company, contact, pain, email, phone, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [input.name, input.company, input.contact, input.pain, input.email, input.phone, input.referred_by || null],
    );
  } catch {
    try {
      inserted = await sql.query<{ id: number }>(
        `INSERT INTO pilot_leads (name, company, contact, pain, email, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [input.name, input.company, input.contact, input.pain, input.email, input.phone],
      );
    } catch {
      inserted = await sql.query<{ id: number }>(
        `INSERT INTO pilot_leads (name, company, contact, pain)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [input.name, input.company, input.contact, input.pain],
      );
    }
  }

  const id = inserted[0]?.id;
  if (typeof id !== "number") {
    throw new Error("Pilot lead insert did not return an id");
  }

  let rows: PilotLead[];
  try {
    rows = await sql.query<PilotLead>(
      `SELECT id, created_at, name, company, contact, pain, email, phone, referred_by
         FROM pilot_leads
        WHERE id = $1`,
      [id],
    );
  } catch {
    try {
      rows = await sql.query<PilotLead>(
        `SELECT id, created_at, name, company, contact, pain, email, phone
           FROM pilot_leads
          WHERE id = $1`,
        [id],
      );
    } catch {
      rows = await sql.query<PilotLead>(
        `SELECT id, created_at, name, company, contact, pain
           FROM pilot_leads
          WHERE id = $1`,
        [id],
      );
    }
  }

  const lead = rows[0];
  if (!lead) {
    throw new Error("Pilot lead insert could not be verified");
  }
  await emailPilotLead(input).catch((err) => {
    console.error("[pilot] inbox notify failed:", err);
  });
  return lead;
}

export const PILOT_INBOX = "facilitiesevidenceos@gmail.com";

async function emailPilotLead(input: PilotLeadInput): Promise<void> {
  const text = [
    "New FEOS founding-pilot request",
    "",
    `Name: ${input.name}`,
    `Company / property: ${input.company}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    `Headache: ${input.pain}`,
    input.referred_by
      ? `Referred by: ${referrerLabel(input.referred_by) || input.referred_by}`
      : "Referred by: (direct / your QR)",
  ].join("\n");

  const res = await fetch("https://formsubmit.co/ajax/" + PILOT_INBOX, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: `FEOS founding pilot — ${input.company}`,
      _replyto: input.email,
      _template: "box",
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      headache: input.pain,
      referred_by: input.referred_by
        ? referrerLabel(input.referred_by) || input.referred_by
        : "direct",
      message: text,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`mail gateway ${res.status}`);
}

export function isDeskOperator(email: unknown): boolean {
  return clip(email, 120).toLowerCase() === PILOT_INBOX;
}

export async function listPilotLeads(): Promise<PilotLead[]> {
  const sql = await getSql();
  try {
    return await sql.query<PilotLead>(
      `SELECT id, created_at, name, company, contact, pain, email, phone, referred_by
         FROM pilot_leads
        ORDER BY id DESC`,
    );
  } catch {
    try {
      return await sql.query<PilotLead>(
        `SELECT id, created_at, name, company, contact, pain, email, phone
           FROM pilot_leads
          ORDER BY id DESC`,
      );
    } catch {
      return await sql.query<PilotLead>(
        `SELECT id, created_at, name, company, contact, pain
           FROM pilot_leads
          ORDER BY id DESC`,
      );
    }
  }
}

export async function getPilotLeadById(id: number): Promise<PilotLead | null> {
  const sql = await getSql();
  try {
    const rows = await sql.query<PilotLead>(
      `SELECT id, created_at, name, company, contact, pain, email, phone, referred_by
         FROM pilot_leads
        WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  } catch {
    try {
      const rows = await sql.query<PilotLead>(
        `SELECT id, created_at, name, company, contact, pain, email, phone
           FROM pilot_leads
          WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    } catch {
      const rows = await sql.query<PilotLead>(
        `SELECT id, created_at, name, company, contact, pain
           FROM pilot_leads
          WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    }
  }
}



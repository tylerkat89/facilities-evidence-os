/** Known QR referral codes. Unknown values are dropped — not stored. */
export const PILOT_REFERRERS = {
  ups: { code: "ups", label: "UPS roommate" },
} as const;

export type ReferrerCode = keyof typeof PILOT_REFERRERS;

export function normalizeReferrer(value: unknown): string {
  const code = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 24);
  return code in PILOT_REFERRERS ? code : "";
}

export function referrerLabel(code: string): string {
  const row = PILOT_REFERRERS[code as ReferrerCode];
  return row ? row.label : "";
}

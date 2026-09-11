CREATE TABLE IF NOT EXISTS pilot_leads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  contact TEXT NOT NULL,
  pain TEXT NOT NULL,
  CONSTRAINT pilot_leads_name_len CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT pilot_leads_company_len CHECK (char_length(company) BETWEEN 1 AND 120),
  CONSTRAINT pilot_leads_contact_len CHECK (char_length(contact) BETWEEN 5 AND 120),
  CONSTRAINT pilot_leads_pain_len CHECK (char_length(pain) BETWEEN 1 AND 400)
);

CREATE INDEX IF NOT EXISTS pilot_leads_created_at_idx
  ON pilot_leads (created_at DESC);

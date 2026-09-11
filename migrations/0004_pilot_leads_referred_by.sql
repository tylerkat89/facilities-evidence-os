alter table pilot_leads add column if not exists referred_by text;
create index if not exists pilot_leads_referred_by_idx on pilot_leads (referred_by);

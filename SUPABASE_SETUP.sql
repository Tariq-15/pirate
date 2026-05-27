-- ─────────────────────────────────────────────────────────────────────────────
-- Pirate Card Game — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists rooms (
  code        text primary key,
  state       jsonb not null,
  host_id     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists rooms_updated_at_idx on rooms (updated_at);

-- Anonymous guest access (no auth). Casual game — fine for now.
alter table rooms enable row level security;

drop policy if exists "rooms_select_all"  on rooms;
drop policy if exists "rooms_insert_all"  on rooms;
drop policy if exists "rooms_update_all"  on rooms;
drop policy if exists "rooms_delete_all"  on rooms;

create policy "rooms_select_all" on rooms for select using (true);
create policy "rooms_insert_all" on rooms for insert with check (true);
create policy "rooms_update_all" on rooms for update using (true) with check (true);
create policy "rooms_delete_all" on rooms for delete using (true);

-- Realtime: push row updates to subscribers
alter publication supabase_realtime add table rooms;

-- Optional housekeeping: drop rooms older than 24h (call manually or via cron)
-- delete from rooms where updated_at < now() - interval '24 hours';

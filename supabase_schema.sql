-- Run this in Supabase SQL Editor

-- ─── Keys table ──────────────────────────────────────────────────────────────
create table if not exists keys (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  duration_days integer not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  activated_at timestamptz,
  device_id text,
  is_active boolean not null default true,
  note text
);

-- Index for fast key lookup from iOS app
create index if not exists keys_key_idx on keys(key);
create index if not exists keys_device_idx on keys(device_id);

-- ─── Banned admins table ─────────────────────────────────────────────────────
-- Used by Owner to ban admin accounts that have corrupted keys
create table if not exists banned_admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  reason text,
  banned_at timestamptz not null default now()
);

create index if not exists banned_admins_username_idx on banned_admins(username);

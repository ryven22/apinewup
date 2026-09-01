-- Run this in Supabase SQL Editor

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

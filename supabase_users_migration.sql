-- ─── Users table ─────────────────────────────────────────────────────────────
-- Stores admin and seller accounts created by the owner
-- Owner credentials remain in .env.local and are never stored here

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,          -- plain text (same pattern as existing admin)
  role text not null check (role in ('admin', 'seller')),
  is_banned boolean not null default false,
  ban_reason text,
  created_at timestamptz not null default now()
);

create index if not exists users_username_idx on users(username);
create index if not exists users_role_idx on users(role);

-- Drop the old banned_admins table if you want (optional — login no longer uses it)
-- drop table if exists banned_admins;

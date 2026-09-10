# MOD TOOLS — Key Management Dashboard

Black & white license key management platform built with Next.js + Supabase.

---

## Accounts

| Role  | Username        | Password  |
|-------|-----------------|-----------|
| Admin | adminmodtools   | admin1    |
| Owner | ownermodtools   | aowner1   |

---

## Features

- **Admin** — generate, revoke, delete, and search license keys
- **Owner** — everything admin can do + ban/unban admin accounts via Owner Panel

### Owner Ban System
If an admin abuses or corrupts keys, the owner can ban them from the Owner Panel (`/owner`).  
Banned admins will be blocked at login with a reason message.

---

## Key Format

```
MT-XXXX-XXXX-XXXX
```

---

## Setup

1. Copy `.env.local.example` → `.env.local` and fill in your values
2. Run the SQL in `supabase_schema.sql` in your Supabase SQL Editor (includes `keys` and `banned_admins` tables)
3. `npm install && npm run dev`

---

## iOS Integration

See `ios/LicenseService.swift` and `ios/LicenseGateView.swift`.

Validate endpoint: `POST /api/validate`

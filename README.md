# REGS XD — License Key System

Web dashboard + API + iOS integration for managing license keys.

---

## Stack
- **Web/API**: Next.js 14 + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (free)
- **iOS**: Swift (LicenseService + LicenseGateView)

---

## Setup — Step by Step

### 1. Supabase (database)

1. Buka **supabase.com** → New Project
2. Catat: `Project URL` dan `service_role` key (Settings → API)
3. Buka **SQL Editor** → paste isi file `supabase_schema.sql` → Run

### 2. Configure environment

Edit file `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...
ADMIN_USERNAME=regsxd
ADMIN_PASSWORD=leaimut
JWT_SECRET=ganti-dengan-random-string-panjang
```

### 3. Deploy ke Vercel

1. Push folder `regsxd-keys` ke GitHub repo baru
2. Buka **vercel.com** → Import repo
3. Add environment variables (sama seperti `.env.local`)
4. Deploy → dapat URL misal `https://regsxd-keys.vercel.app`

### 4. Akses dashboard

Buka URL Vercel kamu → login dengan:
- Username: `regsxd`
- Password: `leaimut`

### 5. Integrate ke iOS app

**a. Copy files ke Xcode project:**
- `ios/LicenseService.swift` → drag ke folder `helpers/`
- `ios/LicenseGateView.swift` → drag ke folder `views/`

**b. Update URL di LicenseService.swift:**
```swift
static let apiBaseURL = "https://regsxd-keys.vercel.app"  // ganti URL kamu
```

**c. Wrap ContentView di App.swift:**
```swift
// Sebelum:
ContentView()

// Sesudah:
LicenseGateView {
    ContentView()
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/validate` | Validate key (iOS app) |
| GET | `/api/keys` | List all keys (dashboard) |
| POST | `/api/keys` | Generate keys (dashboard) |
| DELETE | `/api/keys/[id]` | Delete key (dashboard) |
| PATCH | `/api/keys/[id]` | Revoke/enable key (dashboard) |
| POST | `/api/login` | Admin login |
| POST | `/api/logout` | Admin logout |

### POST /api/validate (iOS)
```json
Request:  { "key": "REGS-XXXX-XXXX-XXXX", "device_id": "uuid" }
Response: { "valid": true, "expires_at": "2026-09-08T...", "duration_days": 7 }
Response: { "valid": false, "error": "Key has expired" }
```

### POST /api/keys (generate)
```json
Request:  { "duration_days": 7, "count": 5, "note": "VIP" }
Response: { "keys": [...] }
```

---

## Key Format

`REGS-XXXX-XXXX-XXXX` — contoh: `REGS-A3F9-BC12-77DE`

---

## Fitur

- ✅ Generate key 1 / 7 / 30 hari
- ✅ Generate batch (sampai 50 sekaligus)
- ✅ Key terikat ke device saat pertama aktivasi
- ✅ Offline fallback (pakai cache kalau server tidak bisa dihubungi)
- ✅ Revoke / enable key dari dashboard
- ✅ Delete key
- ✅ Cari key by nama, note, device ID
- ✅ Stats: total, valid, activated, expired

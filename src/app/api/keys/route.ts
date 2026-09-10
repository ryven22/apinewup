import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifySession } from '@/lib/auth'
import { generateKey, daysToExpiry, VALID_DURATIONS } from '@/lib/keygen'

// GET /api/keys — list all keys (dashboard)
export async function GET() {
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('keys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data, role: session.role })
}

// POST /api/keys — generate new key
// Body: { duration_days: 1|3|7|30|40|0, note?: string, count?: number }
// duration_days = 0 means "lifeteam"
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { duration_days, note, count = 1 } = await req.json()

  if (!(VALID_DURATIONS as readonly number[]).includes(duration_days)) {
    return NextResponse.json(
      { error: 'duration_days must be 1, 3, 7, 30, 40, or 0 (lifeteam)' },
      { status: 400 }
    )
  }

  const batchCount = Math.min(Math.max(1, count), 50)
  const rows = Array.from({ length: batchCount }, () => ({
    key: generateKey(),
    duration_days,
    expires_at: daysToExpiry(duration_days),
    note: note || null,
  }))

  const { data, error } = await supabase.from('keys').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ keys: data }, { status: 201 })
}

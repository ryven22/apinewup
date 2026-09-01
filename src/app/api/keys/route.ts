import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifySession } from '@/lib/auth'
import { generateKey, daysToExpiry } from '@/lib/keygen'

// GET /api/keys — list all keys (dashboard)
export async function GET() {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('keys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data })
}

// POST /api/keys — generate new key (dashboard)
// Body: { duration_days: 1 | 7 | 30, note?: string, count?: number }
export async function POST(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { duration_days, note, count = 1 } = await req.json()

  if (![1, 7, 30].includes(duration_days)) {
    return NextResponse.json({ error: 'duration_days must be 1, 7, or 30' }, { status: 400 })
  }

  const batchCount = Math.min(Math.max(1, count), 50) // max 50 at once
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

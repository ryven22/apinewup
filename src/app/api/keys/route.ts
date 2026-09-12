import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifySession } from '@/lib/auth'
import { generateKey, daysToExpiry, dateToExpiry, VALID_DURATIONS } from '@/lib/keygen'

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
// Body:
//   Preset:  { duration_days: 1|3|7|30|40|0, note?, count? }
//   Custom:  { duration_days: number (any), note?, count? }  ← custom days
//   By date: { expires_at: 'YYYY-MM-DD', note?, count? }    ← specific date
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { note, count = 1 } = body

  let duration_days: number
  let expires_at: string

  // Mode 1: specific date provided
  if (body.expires_at && !body.duration_days) {
    const d = new Date(body.expires_at)
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid expires_at date' }, { status: 400 })
    }
    const today = new Date()
    duration_days = Math.max(1, Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    expires_at = dateToExpiry(body.expires_at)
  }
  // Mode 2: duration_days (preset or custom number)
  else {
    duration_days = Number(body.duration_days)
    if (isNaN(duration_days) || duration_days < 0) {
      return NextResponse.json({ error: 'Invalid duration_days' }, { status: 400 })
    }
    expires_at = daysToExpiry(duration_days)
  }

  const batchCount = Math.min(Math.max(1, count), 50)
  const rows = Array.from({ length: batchCount }, () => ({
    key: generateKey(),
    duration_days,
    expires_at,
    note: note || null,
  }))

  const { data, error } = await supabase.from('keys').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ keys: data }, { status: 201 })
}

// PUT /api/keys — pause or resume all keys (except OWNER:/ADMIN: protected ones)
export async function PUT(req: NextRequest) {
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action } = await req.json()
  if (action !== 'pause' && action !== 'resume') {
    return NextResponse.json({ error: 'action must be pause or resume' }, { status: 400 })
  }

  const newActive = action === 'resume'

  const { data: allKeys, error: fetchError } = await supabase
    .from('keys')
    .select('id, note')

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const targetIds = (allKeys || [])
    .filter(k => {
      const note = k.note || ''
      return !note.startsWith('OWNER:') && !note.startsWith('ADMIN:')
    })
    .map(k => k.id)

  if (targetIds.length === 0) return NextResponse.json({ updated: 0 })

  const { error: updateError } = await supabase
    .from('keys')
    .update({ is_active: newActive })
    .in('id', targetIds)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ updated: targetIds.length, action })
}

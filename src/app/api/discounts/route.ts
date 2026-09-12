import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// GET /api/discounts — get all discounts (any authenticated user can read)
export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('discounts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ discounts: data })
}

// POST /api/discounts — create a new discount (owner only)
// Body: { duration_days, discount_pct, slot_limit?, expires_at? }
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { duration_days, discount_pct, slot_limit, expires_at } = await req.json()

  if (![1, 3, 7, 30, 40, 0].includes(duration_days)) {
    return NextResponse.json({ error: 'Invalid duration_days' }, { status: 400 })
  }
  if (typeof discount_pct !== 'number' || discount_pct < 1 || discount_pct > 99) {
    return NextResponse.json({ error: 'discount_pct must be 1-99' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('discounts')
    .insert({
      duration_days,
      discount_pct,
      slot_limit: slot_limit || null,
      expires_at: expires_at || null,
      is_active: true,
      slots_used: 0,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ discount: data }, { status: 201 })
}

// DELETE /api/discounts — delete a discount (owner only)
// Body: { id }
export async function DELETE(req: NextRequest) {
  const session = await verifySession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('discounts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/discounts — toggle active/inactive (owner only)
// Body: { id }
export async function PATCH(req: NextRequest) {
  const session = await verifySession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  const { data: current } = await supabase.from('discounts').select('is_active').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('discounts')
    .update({ is_active: !current.is_active })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ discount: data })
}

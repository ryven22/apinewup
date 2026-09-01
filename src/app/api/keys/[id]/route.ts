import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifySession } from '@/lib/auth'

// DELETE /api/keys/[id] — delete a key
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase.from('keys').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/keys/[id] — toggle is_active
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: current } = await supabase
    .from('keys').select('is_active').eq('id', params.id).single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('keys')
    .update({ is_active: !current.is_active })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ key: data })
}

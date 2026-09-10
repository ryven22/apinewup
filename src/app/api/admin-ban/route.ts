import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifySession } from '@/lib/auth'

/**
 * GET /api/admin-ban
 * Returns list of banned admin usernames. Owner only.
 */
export async function GET() {
  const session = await verifySession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('banned_admins')
    .select('*')
    .order('banned_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ banned: data })
}

/**
 * POST /api/admin-ban
 * Ban an admin username. Owner only.
 * Body: { username: string, reason?: string }
 */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { username, reason } = await req.json()
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const adminUser = (process.env.ADMIN_USERNAME || 'adminmodtools').trim()
  if (username.trim() !== adminUser) {
    return NextResponse.json({ error: 'Username not found' }, { status: 404 })
  }

  // Check if already banned
  const { data: existing } = await supabase
    .from('banned_admins')
    .select('id')
    .eq('username', username.trim())
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already banned' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('banned_admins')
    .insert({ username: username.trim(), reason: reason || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ banned: data }, { status: 201 })
}

/**
 * DELETE /api/admin-ban
 * Unban an admin username. Owner only.
 * Body: { username: string }
 */
export async function DELETE(req: NextRequest) {
  const session = await verifySession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { username } = await req.json()
  if (!username) return NextResponse.json({ error: 'username is required' }, { status: 400 })

  const { error } = await supabase
    .from('banned_admins')
    .delete()
    .eq('username', username.trim())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

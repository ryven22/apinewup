import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// Only owner can manage users
async function requireOwner() {
  const session = await verifySession()
  if (!session || session.role !== 'owner') return null
  return session
}

// GET /api/users — list all admin and seller accounts
export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, is_banned, ban_reason, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data })
}

// POST /api/users — create a new admin or seller account
// Body: { username, password, role: 'admin' | 'seller' }
export async function POST(req: NextRequest) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { username, password, role } = await req.json()

  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
  }

  if (role !== 'admin' && role !== 'seller') {
    return NextResponse.json({ error: 'Role must be admin or seller' }, { status: 400 })
  }

  // Check username taken
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username.trim())
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ username: username.trim(), password: password.trim(), role })
    .select('id, username, role, is_banned, ban_reason, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data }, { status: 201 })
}

// DELETE /api/users — delete a user account
// Body: { id }
export async function DELETE(req: NextRequest) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/users — ban or unban a user
// Body: { id, action: 'ban' | 'unban', reason?: string }
export async function PATCH(req: NextRequest) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, action, reason } = await req.json()
  if (!id || !['ban', 'unban'].includes(action)) {
    return NextResponse.json({ error: 'id and action (ban|unban) required' }, { status: 400 })
  }

  const update = action === 'ban'
    ? { is_banned: true, ban_reason: reason?.trim() || null }
    : { is_banned: false, ban_reason: null }

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', id)
    .select('id, username, role, is_banned, ban_reason, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    const user = String(username).trim()
    const pass = String(password).trim()

    const ownerUser = (process.env.OWNER_USERNAME || 'ownermodtools').trim()
    const ownerPass = (process.env.OWNER_PASSWORD || 'aowner1').trim()

    // ── Owner login (env only, cannot be managed from UI) ──────────────────
    if (user === ownerUser && pass === ownerPass) {
      await createSession('owner')
      return NextResponse.json({ success: true, role: 'owner' })
    }

    // ── Admin / Seller login (from database) ───────────────────────────────
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, username, password, role, is_banned, ban_reason')
      .eq('username', user)
      .single()

    if (error || !dbUser) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check password (plain text match, same as original pattern)
    if (dbUser.password !== pass) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if banned
    if (dbUser.is_banned) {
      return NextResponse.json(
        { error: `Account banned${dbUser.ban_reason ? `: ${dbUser.ban_reason}` : ''}` },
        { status: 403 }
      )
    }

    const role = dbUser.role as 'admin' | 'seller'
    await createSession(role)
    return NextResponse.json({ success: true, role })

  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

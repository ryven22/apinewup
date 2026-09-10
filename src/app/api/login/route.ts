import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    const user = String(username).trim()
    const pass = String(password).trim()

    const adminUser = (process.env.ADMIN_USERNAME || 'adminmodtools').trim()
    const adminPass = (process.env.ADMIN_PASSWORD || 'admin1').trim()
    const ownerUser = (process.env.OWNER_USERNAME || 'ownermodtools').trim()
    const ownerPass = (process.env.OWNER_PASSWORD || 'aowner1').trim()

    // Owner login — owner cannot be banned
    if (user === ownerUser && pass === ownerPass) {
      await createSession('owner')
      return NextResponse.json({ success: true, role: 'owner' })
    }

    // Admin login — check if banned first
    if (user === adminUser && pass === adminPass) {
      const { data: banned } = await supabase
        .from('banned_admins')
        .select('id, reason')
        .eq('username', user)
        .single()

      if (banned) {
        return NextResponse.json(
          { error: `Account banned${banned.reason ? `: ${banned.reason}` : ''}` },
          { status: 403 }
        )
      }

      await createSession('admin')
      return NextResponse.json({ success: true, role: 'admin' })
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

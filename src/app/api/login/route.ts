import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    const adminUser = (process.env.ADMIN_USERNAME || 'regsxd').trim()
    const adminPass = (process.env.ADMIN_PASSWORD || 'leaimut').trim()

    if (
      String(username).trim() === adminUser &&
      String(password).trim() === adminPass
    ) {
      await createSession()
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

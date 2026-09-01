import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/validate
// Body: { key: string, device_id: string }
// Called by iOS app on launch
export async function POST(req: NextRequest) {
  try {
    const { key, device_id } = await req.json()

    if (!key || !device_id) {
      return NextResponse.json({ valid: false, error: 'Missing key or device_id' }, { status: 400 })
    }

    const cleanKey = String(key).trim().toUpperCase()
    const cleanDevice = String(device_id).trim()

    // Find key in database
    const { data, error } = await supabase
      .from('keys')
      .select('*')
      .eq('key', cleanKey)
      .single()

    if (error || !data) {
      return NextResponse.json({ valid: false, error: 'Key not found' }, { status: 200 })
    }

    // Check if key is disabled by admin
    if (!data.is_active) {
      return NextResponse.json({ valid: false, error: 'Key has been revoked' }, { status: 200 })
    }

    // Check if key already activated on a different device
    if (data.device_id && data.device_id !== cleanDevice) {
      return NextResponse.json({ valid: false, error: 'Key is bound to another device' }, { status: 200 })
    }

    // Check expiry
    const now = new Date()
    const expiresAt = new Date(data.expires_at)
    if (now > expiresAt) {
      return NextResponse.json({ valid: false, error: 'Key has expired', expires_at: data.expires_at }, { status: 200 })
    }

    // First activation — bind device_id
    if (!data.device_id) {
      await supabase
        .from('keys')
        .update({ device_id: cleanDevice, activated_at: now.toISOString() })
        .eq('key', cleanKey)
    }

    return NextResponse.json({
      valid: true,
      expires_at: data.expires_at,
      duration_days: data.duration_days,
    }, { status: 200 })

  } catch {
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}

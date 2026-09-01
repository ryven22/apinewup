import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasUsername: !!process.env.ADMIN_USERNAME,
    hasPassword: !!process.env.ADMIN_PASSWORD,
    usernameValue: process.env.ADMIN_USERNAME,
    // jangan tampilkan password asli, cukup panjangnya
    passwordLength: process.env.ADMIN_PASSWORD?.length ?? 0,
  })
}

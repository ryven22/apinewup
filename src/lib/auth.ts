import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'modtools_session'

export type Role = 'admin' | 'owner' | 'seller'

export async function createSession(role: Role = 'admin') {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
}

export async function verifySession(): Promise<false | { role: Role }> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return false
    const { payload } = await jwtVerify(token, secret)
    const role = (payload.role as Role) || 'admin'
    return { role }
  } catch {
    return false
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getSessionRole(): Promise<Role | null> {
  const session = await verifySession()
  if (!session) return null
  return session.role
}

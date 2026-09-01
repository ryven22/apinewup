'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
    }}>
      <div style={{
        width: 360, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 36,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--red-glow)', border: '1px solid var(--red)',
            marginBottom: 14,
          }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--red)' }}>RX</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>REGS XD</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>Key Management Dashboard</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</div>
          )}
          <button type="submit" className="btn-red" disabled={loading} style={{ marginTop: 4, padding: '12px 0' }}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

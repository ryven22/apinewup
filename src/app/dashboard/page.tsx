'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Key {
  id: string
  key: string
  duration_days: number
  created_at: string
  expires_at: string
  activated_at: string | null
  device_id: string | null
  is_active: boolean
  note: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [keys, setKeys] = useState<Key[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [duration, setDuration] = useState(7)
  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/keys')
    if (res.status === 401) { router.push('/'); return }
    const data = await res.json()
    setKeys(data.keys || [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function generateKeys() {
    setGenerating(true)
    await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_days: duration, count, note: note || undefined }),
    })
    setNote('')
    await fetchKeys()
    setGenerating(false)
  }

  async function deleteKey(id: string) {
    if (!confirm('Delete this key?')) return
    await fetch(`/api/keys/${id}`, { method: 'DELETE' })
    setKeys(k => k.filter(x => x.id !== id))
  }

  async function toggleKey(id: string) {
    const res = await fetch(`/api/keys/${id}`, { method: 'PATCH' })
    const data = await res.json()
    setKeys(k => k.map(x => x.id === id ? data.key : x))
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function keyStatus(k: Key): { label: string; badge: string } {
    if (!k.is_active) return { label: 'Revoked', badge: 'badge-gray' }
    const now = new Date()
    if (new Date(k.expires_at) < now) return { label: 'Expired', badge: 'badge-red' }
    if (k.activated_at) return { label: 'Active', badge: 'badge-green' }
    return { label: 'Unused', badge: 'badge-yellow' }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const filtered = keys.filter(k =>
    k.key.includes(search.toUpperCase()) ||
    (k.note || '').toLowerCase().includes(search.toLowerCase()) ||
    (k.device_id || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: keys.length,
    active: keys.filter(k => k.is_active && new Date(k.expires_at) > new Date()).length,
    used: keys.filter(k => k.activated_at).length,
    expired: keys.filter(k => new Date(k.expires_at) < new Date()).length,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'var(--red-glow)', border: '1px solid var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: 'var(--red)', fontSize: 14,
          }}>RX</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>REGS XD Keys</span>
        </div>
        <button className="btn-ghost" onClick={logout} style={{ fontSize: 13 }}>Logout</button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Keys', value: stats.total, color: 'var(--text)' },
            { label: 'Valid', value: stats.active, color: 'var(--green)' },
            { label: 'Activated', value: stats.used, color: 'var(--red)' },
            { label: 'Expired', value: stats.expired, color: 'var(--text-dim)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Generate */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Generate Keys</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Duration</div>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
                <option value={1}>1 Day</option>
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Count (max 50)</div>
              <input
                type="number" min={1} max={50} value={count}
                onChange={e => setCount(Number(e.target.value))}
                style={{ width: 90 }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Note (optional)</div>
              <input
                placeholder="e.g. VIP user"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <button className="btn-red" onClick={generateKeys} disabled={generating}
              style={{ padding: '10px 22px', whiteSpace: 'nowrap' }}>
              {generating ? 'Generating…' : `Generate ${count > 1 ? `${count} Keys` : 'Key'}`}
            </button>
          </div>
        </div>

        {/* Keys Table */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>All Keys ({filtered.length})</span>
            <input
              placeholder="Search key, note, device…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 240 }}
            />
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>No keys found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Key', 'Duration', 'Status', 'Created', 'Expires', 'Device', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(k => {
                    const status = keyStatus(k)
                    return (
                      <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <code style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--red)' }}>{k.key}</code>
                            <button
                              className="btn-ghost"
                              onClick={() => copyKey(k.key)}
                              style={{ fontSize: 11, padding: '3px 8px' }}
                            >
                              {copied === k.key ? '✓' : 'Copy'}
                            </button>
                          </div>
                          {k.note && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{k.note}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {k.duration_days === 1 ? '1 Day' : k.duration_days === 7 ? '7 Days' : '30 Days'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${status.badge}`}>{status.label}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{formatDate(k.created_at)}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{formatDate(k.expires_at)}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-dim)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {k.device_id ? <code style={{ fontSize: 11 }}>{k.device_id.substring(0, 16)}…</code> : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-ghost" onClick={() => toggleKey(k.id)} style={{ fontSize: 11, padding: '4px 10px' }}>
                              {k.is_active ? 'Revoke' : 'Enable'}
                            </button>
                            <button className="btn-danger" onClick={() => deleteKey(k.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

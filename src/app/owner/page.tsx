'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface BannedAdmin {
  id: string
  username: string
  reason: string | null
  banned_at: string
}

export default function OwnerPage() {
  const router = useRouter()
  const [banned, setBanned] = useState<BannedAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [banUsername, setBanUsername] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banning, setBanning] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const fetchBanned = useCallback(async () => {
    const res = await fetch('/api/admin-ban')
    if (res.status === 401 || res.status === 403) {
      router.push('/')
      return
    }
    const data = await res.json()
    setBanned(data.banned || [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchBanned() }, [fetchBanned])

  function showFeedback(type: 'ok' | 'err', msg: string) {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function banAdmin() {
    if (!banUsername.trim()) return
    setBanning(true)
    const res = await fetch('/api/admin-ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: banUsername.trim(), reason: banReason.trim() || undefined }),
    })
    const data = await res.json()
    setBanning(false)
    if (res.ok) {
      setBanUsername('')
      setBanReason('')
      showFeedback('ok', `Admin "${banUsername.trim()}" has been banned.`)
      await fetchBanned()
    } else {
      showFeedback('err', data.error || 'Failed to ban admin')
    }
  }

  async function unbanAdmin(username: string) {
    if (!confirm(`Unban "${username}"?`)) return
    const res = await fetch('/api/admin-ban', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    if (res.ok) {
      showFeedback('ok', `Admin "${username}" has been unbanned.`)
      setBanned(b => b.filter(x => x.username !== username))
    } else {
      showFeedback('err', 'Failed to unban admin')
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const adminUsername = 'adminmodtools'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            overflow: 'hidden', border: '1px solid var(--border)',
            background: '#000', flexShrink: 0,
          }}>
            <Image src="/logo.png" alt="MOD TOOLS" width={40} height={40} style={{ objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.05em' }}>MOD TOOLS</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>Owner Panel</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge badge-white" style={{ textTransform: 'uppercase', letterSpacing: '0.07em' }}>Owner</span>
          <button className="btn-ghost" onClick={() => router.push('/dashboard')} style={{ fontSize: 12, padding: '6px 14px' }}>
            Dashboard
          </button>
          <button className="btn-ghost" onClick={logout} style={{ fontSize: 13 }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px' }}>
        {/* Feedback toast */}
        {feedback && (
          <div style={{
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            background: feedback.type === 'ok' ? 'rgba(34,197,94,0.10)' : 'rgba(255,68,68,0.10)',
            border: `1px solid ${feedback.type === 'ok' ? 'rgba(34,197,94,0.30)' : 'rgba(255,68,68,0.30)'}`,
            color: feedback.type === 'ok' ? 'var(--green)' : '#ff6666',
          }}>
            {feedback.msg}
          </div>
        )}

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.04em' }}>Admin Management</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 5 }}>
            Ban or unban admin accounts that have corrupted keys.
          </div>
        </div>

        {/* Admin status card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '22px 24px',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
            Admin Account
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: 'var(--text-dim)',
              }}>
                👤
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{adminUsername}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Admin account</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {banned.some(b => b.username === adminUsername) ? (
                <>
                  <span className="badge badge-red">Banned</span>
                  <button className="btn-unban" onClick={() => unbanAdmin(adminUsername)}>
                    Unban
                  </button>
                </>
              ) : (
                <>
                  <span className="badge badge-green">Active</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ban form */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '22px 24px',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
            Ban Admin
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Admin Username
              </div>
              <input
                placeholder="e.g. adminmodtools"
                value={banUsername}
                onChange={e => setBanUsername(e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Reason (optional)
              </div>
              <input
                placeholder="e.g. corrupted keys / misuse"
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
              />
            </div>
            <button
              className="btn-ban"
              onClick={banAdmin}
              disabled={banning || !banUsername.trim()}
              style={{ alignSelf: 'flex-start', padding: '9px 22px', fontSize: 13, borderRadius: 10 }}
            >
              {banning ? 'Banning…' : '🚫 Ban Admin'}
            </button>
          </div>
        </div>

        {/* Banned history */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              BAN HISTORY <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({banned.length})</span>
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div>
          ) : banned.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
              No banned admins
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Username', 'Reason', 'Banned At', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        color: 'var(--text-dim)',
                        fontWeight: 600,
                        fontSize: 11,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {banned.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.username}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-dim)' }}>{b.reason || '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{formatDate(b.banned_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button className="btn-unban" onClick={() => unbanAdmin(b.username)}>Unban</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

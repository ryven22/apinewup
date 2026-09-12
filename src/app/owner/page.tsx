'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { SidebarPage, Role } from '@/components/Sidebar'
import { durationLabel, VALID_DURATIONS, KEY_PRICES } from '@/lib/keygen'

interface User {
  id: string
  username: string
  role: 'admin' | 'seller'
  is_banned: boolean
  ban_reason: string | null
  created_at: string
}

interface Discount {
  id: string
  duration_days: number
  discount_pct: number
  slot_limit: number | null
  slots_used: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmStyle, onConfirm, onCancel }: {
  title: string
  message: string
  confirmLabel: string
  confirmStyle: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '28px 28px 24px', width: 360,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel} style={{ padding: '8px 20px', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            padding: '8px 20px', fontSize: 13, fontWeight: 600,
            borderRadius: 8, border: 'none', cursor: 'pointer',
            background: confirmStyle === 'danger' ? 'rgba(255,68,68,0.15)' : 'rgba(245,158,11,0.15)',
            color: confirmStyle === 'danger' ? '#ff6666' : 'var(--yellow)',
            border: `1px solid ${confirmStyle === 'danger' ? 'rgba(255,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
          } as React.CSSProperties}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Ban Modal ─────────────────────────────────────────────────────────────────
function BanModal({ username, onConfirm, onCancel }: {
  username: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '28px 28px 24px', width: 380,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Ban User</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 18 }}>
          Ban <strong style={{ color: '#fff' }}>{username}</strong>? They won't be able to login.
        </div>
        <div className="field-label" style={{ marginBottom: 6 }}>Reason (optional)</div>
        <input placeholder="e.g. misuse / violation" value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ marginBottom: 20 }}
          onKeyDown={e => e.key === 'Enter' && onConfirm(reason)} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel} style={{ padding: '8px 20px', fontSize: 13 }}>
            Cancel
          </button>
          <button className="btn-ban" onClick={() => onConfirm(reason)}
            style={{ padding: '8px 20px', fontSize: 13, borderRadius: 8 }}>
            Ban User
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OwnerPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Add user form
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'seller'>('admin')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Modals
  const [banModal, setBanModal] = useState<{ id: string; username: string } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; confirmLabel: string
    confirmStyle: 'danger' | 'warning'; onConfirm: () => void
  } | null>(null)

  // Filter
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'seller'>('all')

  // Discounts
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [discDuration, setDiscDuration] = useState(7)
  const [discPct, setDiscPct] = useState(10)
  const [discSlot, setDiscSlot] = useState<string>('')
  const [discExpiry, setDiscExpiry] = useState<string>('')
  const [addingDisc, setAddingDisc] = useState(false)
  const [discError, setDiscError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users')
    if (res.status === 401 || res.status === 403) { router.push('/'); return }
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }, [router])

  const fetchDiscounts = useCallback(async () => {
    const res = await fetch('/api/discounts')
    if (res.ok) {
      const data = await res.json()
      setDiscounts(data.discounts || [])
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchDiscounts()
  }, [fetchUsers, fetchDiscounts])

  function showFeedback(type: 'ok' | 'err', msg: string) {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function addUser() {
    if (!newUsername.trim() || !newPassword.trim()) return
    setAdding(true)
    setAddError(null)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername.trim(), password: newPassword.trim(), role: newRole }),
    })
    const data = await res.json()
    setAdding(false)
    if (res.ok) {
      setNewUsername('')
      setNewPassword('')
      showFeedback('ok', `User "${data.user.username}" (${newRole}) created.`)
      await fetchUsers()
    } else {
      setAddError(data.error || 'Failed to create user')
    }
  }

  function confirmDelete(user: User) {
    setConfirmModal({
      title: 'Delete User',
      message: `Delete "${user.username}" (${user.role})? This action cannot be undone.`,
      confirmLabel: 'Delete',
      confirmStyle: 'danger',
      onConfirm: async () => {
        setConfirmModal(null)
        const res = await fetch('/api/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id }),
        })
        if (res.ok) {
          showFeedback('ok', `User "${user.username}" deleted.`)
          setUsers(u => u.filter(x => x.id !== user.id))
        } else {
          showFeedback('err', 'Failed to delete user')
        }
      },
    })
  }

  async function banUser(id: string, username: string, reason: string) {
    setBanModal(null)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'ban', reason }),
    })
    const data = await res.json()
    if (res.ok) {
      showFeedback('ok', `User "${username}" banned.`)
      setUsers(u => u.map(x => x.id === id ? data.user : x))
    } else {
      showFeedback('err', data.error || 'Failed to ban user')
    }
  }

  async function unbanUser(id: string, username: string) {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'unban' }),
    })
    const data = await res.json()
    if (res.ok) {
      showFeedback('ok', `User "${username}" unbanned.`)
      setUsers(u => u.map(x => x.id === id ? data.user : x))
    } else {
      showFeedback('err', data.error || 'Failed to unban user')
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  async function addDiscount() {
    setAddingDisc(true)
    setDiscError(null)
    const res = await fetch('/api/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duration_days: discDuration,
        discount_pct: discPct,
        slot_limit: discSlot ? parseInt(discSlot) : null,
        expires_at: discExpiry || null,
      }),
    })
    const data = await res.json()
    setAddingDisc(false)
    if (res.ok) {
      setDiscSlot('')
      setDiscExpiry('')
      showFeedback('ok', `Discount ${discPct}% for ${durationLabel(discDuration)} created.`)
      await fetchDiscounts()
    } else {
      setDiscError(data.error || 'Failed to create discount')
    }
  }

  async function deleteDiscount(id: string) {
    const res = await fetch('/api/discounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      showFeedback('ok', 'Discount removed.')
      setDiscounts(d => d.filter(x => x.id !== id))
    }
  }

  async function toggleDiscount(id: string) {
    const res = await fetch('/api/discounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      const data = await res.json()
      setDiscounts(d => d.map(x => x.id === id ? data.discount : x))
    }
  }

  function fmtIDR(n: number) {
    return 'Rp ' + n.toLocaleString('id-ID')
  }

  function handleNavigate(page: SidebarPage) {
    if (page !== 'admin') router.push('/dashboard')
  }

  const filtered = users.filter(u => filterRole === 'all' || u.role === filterRole)
  const adminCount  = users.filter(u => u.role === 'admin').length
  const sellerCount = users.filter(u => u.role === 'seller').length
  const bannedCount = users.filter(u => u.is_banned).length

  return (
    <DashboardLayout activePage="admin" onNavigate={handleNavigate} role={'owner' as Role}>
      {/* Modals */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmStyle={confirmModal.confirmStyle}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {banModal && (
        <BanModal
          username={banModal.username}
          onConfirm={(reason) => banUser(banModal.id, banModal.username, reason)}
          onCancel={() => setBanModal(null)}
        />
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 28px' }}>

        {/* Page header */}
        <div className="page-header">
          <div>
            <div className="page-title">Owner Panel</div>
            <div className="page-subtitle">Manage admin and seller accounts</div>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginBottom: 20, padding: '12px 18px', borderRadius: 10,
            fontSize: 13, fontWeight: 500,
            background: feedback.type === 'ok' ? 'rgba(34,197,94,0.10)' : 'rgba(255,68,68,0.10)',
            border: `1px solid ${feedback.type === 'ok' ? 'rgba(34,197,94,0.30)' : 'rgba(255,68,68,0.30)'}`,
            color: feedback.type === 'ok' ? 'var(--green)' : '#ff6666',
          }}>
            {feedback.msg}
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
          {[
            { label: 'Admin Accounts',  value: adminCount,  color: '#fff'            },
            { label: 'Seller Accounts', value: sellerCount, color: 'var(--green)'    },
            { label: 'Banned',          value: bannedCount, color: 'var(--red)'      },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add user form */}
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-title">Add New User</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div className="field-label">Username</div>
              <input placeholder="e.g. john_admin" value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUser()} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div className="field-label">Password</div>
              <input type="password" placeholder="••••••••" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUser()} />
            </div>
            <div>
              <div className="field-label">Role</div>
              <select value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'seller')}>
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
              </select>
            </div>
            <button
              className="btn-primary"
              onClick={addUser}
              disabled={adding || !newUsername.trim() || !newPassword.trim()}
              style={{ padding: '10px 22px', borderRadius: 10, whiteSpace: 'nowrap' }}>
              {adding ? 'Adding…' : 'Add User'}
            </button>
          </div>
          {addError && <div className="error-banner" style={{ marginTop: 12 }}>{addError}</div>}

          {/* Role info */}
          <div style={{ marginTop: 14, display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-dim)' }}>
            <span><span style={{ color: '#fff', fontWeight: 600 }}>Admin</span> — Keys, License, Revenue, Analytics, Activity Log</span>
            <span><span style={{ color: 'var(--green)', fontWeight: 600 }}>Seller</span> — Keys, License only (read + copy)</span>
          </div>
        </div>

        {/* Users table */}
        <div className="panel panel--flush">
          <div className="table-header">
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
              ALL USERS <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({filtered.length})</span>
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'admin', 'seller'] as const).map(r => (
                <button key={r}
                  className={filterRole === r ? 'btn-primary' : 'btn-ghost'}
                  onClick={() => setFilterRole(r)}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, textTransform: 'capitalize' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">No users yet — add one above</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Username', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="td">
                        <div style={{ fontWeight: 600 }}>{u.username}</div>
                        {u.ban_reason && (
                          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>
                            Reason: {u.ban_reason}
                          </div>
                        )}
                      </td>
                      <td className="td">
                        <span className={`badge ${u.role === 'admin' ? 'badge-gray' : 'badge-green'}`}
                          style={{ textTransform: 'uppercase' }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="td">
                        <span className={`badge ${u.is_banned ? 'badge-red' : 'badge-green'}`}>
                          {u.is_banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="td" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {formatDate(u.created_at)}
                      </td>
                      <td className="td">
                        <div style={{ display: 'flex', gap: 6 }}>
                          {u.is_banned ? (
                            <button className="btn-unban" onClick={() => unbanUser(u.id, u.username)}>
                              Unban
                            </button>
                          ) : (
                            <button className="btn-ban" onClick={() => setBanModal({ id: u.id, username: u.username })}>
                              Ban
                            </button>
                          )}
                          <button
                            onClick={() => confirmDelete(u)}
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 7,
                              background: 'transparent',
                              border: '1px solid rgba(255,68,68,0.35)',
                              color: '#ff6666', cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

        {/* ─── Discount Manager ─── */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 28px 28px' }}>

          {/* Add discount form */}
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-title">Discount Manager</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div className="field-label">Duration</div>
                <select value={discDuration} onChange={e => setDiscDuration(Number(e.target.value))}>
                  {VALID_DURATIONS.map(d => (
                    <option key={d} value={d}>{durationLabel(d)} — {fmtIDR(KEY_PRICES[d] || 0)}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="field-label">Discount %</div>
                <input type="number" min={1} max={99} value={discPct}
                  onChange={e => setDiscPct(Number(e.target.value))}
                  style={{ width: 80 }} />
              </div>
              <div>
                <div className="field-label">Slot Limit (optional)</div>
                <input type="number" min={1} placeholder="unlimited"
                  value={discSlot} onChange={e => setDiscSlot(e.target.value)}
                  style={{ width: 110 }} />
              </div>
              <div>
                <div className="field-label">Expires At (optional)</div>
                <input type="datetime-local" value={discExpiry}
                  onChange={e => setDiscExpiry(e.target.value)}
                  style={{ width: 180 }} />
              </div>
              <button className="btn-primary" onClick={addDiscount} disabled={addingDisc}
                style={{ padding: '10px 20px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                {addingDisc ? 'Adding…' : 'Add Discount'}
              </button>
            </div>

            {/* Price preview */}
            {discPct > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
                Price after discount:{' '}
                <span style={{ color: '#ffffff', fontWeight: 700 }}>
                  {fmtIDR(Math.round((KEY_PRICES[discDuration] || 0) * (1 - discPct / 100)))}
                </span>
                <span style={{ marginLeft: 8, textDecoration: 'line-through' }}>
                  {fmtIDR(KEY_PRICES[discDuration] || 0)}
                </span>
                <span style={{ marginLeft: 8, color: 'var(--yellow)' }}>-{discPct}%</span>
              </div>
            )}
            {discError && <div className="error-banner" style={{ marginTop: 12 }}>{discError}</div>}
          </div>

          {/* Active discounts table */}
          <div className="panel panel--flush">
            <div className="table-header">
              <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
                ACTIVE DISCOUNTS <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({discounts.filter(d => d.is_active).length})</span>
              </span>
            </div>
            {discounts.length === 0 ? (
              <div className="empty-state">No discounts set</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Duration', 'Original', 'Discount', 'Final Price', 'Slots', 'Expires', 'Status', 'Actions'].map(h => (
                        <th key={h} className="th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {discounts.map(d => {
                      const original = KEY_PRICES[d.duration_days] || 0
                      const finalPrice = Math.round(original * (1 - d.discount_pct / 100))
                      const expired = d.expires_at && new Date(d.expires_at) < new Date()
                      const slotFull = d.slot_limit !== null && d.slots_used >= d.slot_limit
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="td">{durationLabel(d.duration_days)}</td>
                          <td className="td" style={{ color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                            {fmtIDR(original)}
                          </td>
                          <td className="td">
                            <span className="badge badge-yellow">-{d.discount_pct}%</span>
                          </td>
                          <td className="td" style={{ fontWeight: 700, color: '#ffffff' }}>
                            {fmtIDR(finalPrice)}
                          </td>
                          <td className="td" style={{ color: 'var(--text-dim)' }}>
                            {d.slot_limit ? `${d.slots_used} / ${d.slot_limit}` : '∞'}
                            {slotFull && <span className="badge badge-red" style={{ marginLeft: 6 }}>Full</span>}
                          </td>
                          <td className="td" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                            {d.expires_at
                              ? new Date(d.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                            {expired && <span className="badge badge-red" style={{ marginLeft: 6 }}>Expired</span>}
                          </td>
                          <td className="td">
                            <span className={`badge ${d.is_active ? 'badge-green' : 'badge-gray'}`}>
                              {d.is_active ? 'Active' : 'Off'}
                            </span>
                          </td>
                          <td className="td">
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-ghost" onClick={() => toggleDiscount(d.id)}
                                style={{ fontSize: 11, padding: '4px 10px' }}>
                                {d.is_active ? 'Pause' : 'Enable'}
                              </button>
                              <button onClick={() => deleteDiscount(d.id)} style={{
                                fontSize: 11, padding: '4px 10px', borderRadius: 7,
                                background: 'transparent', border: '1px solid rgba(255,68,68,0.35)',
                                color: '#ff6666', cursor: 'pointer', fontFamily: 'inherit',
                              }}>Delete</button>
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
    </DashboardLayout>
  )
}

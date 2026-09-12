'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { durationLabel, VALID_DURATIONS, KEY_PRICES, isFreeKey, isOwnerKey, isNonRevenueKey, displayNote, priceLabel } from '@/lib/keygen'
import DashboardLayout from '@/components/DashboardLayout'
import { SidebarPage, Role } from '@/components/Sidebar'

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

interface Discount {
  id: string
  duration_days: number
  discount_pct: number
  slot_limit: number | null
  slots_used: number
  expires_at: string | null
  is_active: boolean
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtIDR(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function keyStatus(k: Key): { label: string; badge: string } {
  if (!k.is_active) return { label: 'Revoked', badge: 'badge-gray' }
  if (new Date(k.expires_at) < new Date()) return { label: 'Expired', badge: 'badge-red' }
  if (k.activated_at) return { label: 'Active', badge: 'badge-green' }
  return { label: 'Unused', badge: 'badge-yellow' }
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
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
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '28px 28px 24px',
        width: 360,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel}
            style={{ padding: '8px 20px', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
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

// ─── Keys Tab ─────────────────────────────────────────────────────────────────
function KeysTab({ keys, loading, role, onRefresh, discounts }: {
  keys: Key[]
  loading: boolean
  role: Role
  onRefresh: () => void
  discounts: Discount[]
}) {
  const [generating, setGenerating] = useState(false)
  const [duration, setDuration] = useState(7)
  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'paid' | 'free'>('all')
  const [copied, setCopied] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [pausingAll, setPausingAll] = useState(false)

  // Duration mode: preset | custom-days | custom-date
  const [durMode, setDurMode] = useState<'preset' | 'days' | 'date'>('preset')
  const [customDays, setCustomDays] = useState<string>('14')
  const [customDate, setCustomDate] = useState<string>('')

  // Modal state
  const [modal, setModal] = useState<null | {
    title: string
    message: string
    confirmLabel: string
    confirmStyle: 'danger' | 'warning'
    onConfirm: () => void
  }>(null)

  function showModal(opts: typeof modal) { setModal(opts) }
  function hideModal() { setModal(null) }

  async function generateKeys() {
    setGenerating(true)
    setGenError(null)
    const finalNote = isOwner
      ? `OWNER:${note.trim()}`
      : isFree
        ? `FREE:${note.trim()}`
        : (note.trim() || undefined)

    // Build body based on duration mode
    let body: Record<string, unknown> = { count, note: finalNote }
    if (durMode === 'preset') {
      body.duration_days = duration
    } else if (durMode === 'days') {
      const d = parseInt(customDays)
      if (!d || d < 1) { setGenError('Enter a valid number of days'); setGenerating(false); return }
      body.duration_days = d
    } else {
      if (!customDate) { setGenError('Select an expiry date'); setGenerating(false); return }
      if (new Date(customDate) <= new Date()) { setGenError('Expiry date must be in the future'); setGenerating(false); return }
      body.expires_at = customDate
    }

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setGenError(b.error || `Server error (${res.status})`)
        setGenerating(false)
        return
      }
      setNote('')
      onRefresh()
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Network error')
    }
    setGenerating(false)
  }

  function confirmDelete(id: string, keyStr: string) {
    showModal({
      title: 'Delete Key',
      message: `Key ${keyStr} will be permanently deleted and cannot be recovered.`,
      confirmLabel: 'Delete',
      confirmStyle: 'danger',
      onConfirm: async () => {
        hideModal()
        await fetch(`/api/keys/${id}`, { method: 'DELETE' })
        onRefresh()
      },
    })
  }

  function confirmPauseAll() {
    const protectedKeys = keys.filter(k =>
      (k.note || '').startsWith('OWNER:') || (k.note || '').startsWith('ADMIN:')
    )
    const activeCount  = keys.filter(k => k.is_active  && !(k.note||'').startsWith('OWNER:') && !(k.note||'').startsWith('ADMIN:')).length
    const pausedCount  = keys.filter(k => !k.is_active && !(k.note||'').startsWith('OWNER:') && !(k.note||'').startsWith('ADMIN:')).length
    const allPaused    = activeCount === 0 && pausedCount > 0

    if (allPaused) {
      // Resume mode
      showModal({
        title: 'Resume All Keys',
        message: `This will re-enable ${pausedCount} paused key${pausedCount !== 1 ? 's' : ''}. Protected keys (OWNER/ADMIN) are not affected.`,
        confirmLabel: 'Resume All',
        confirmStyle: 'warning',
        onConfirm: async () => {
          hideModal()
          setPausingAll(true)
          await fetch('/api/keys', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'resume' }),
          })
          setPausingAll(false)
          onRefresh()
        },
      })
    } else {
      // Pause mode
      showModal({
        title: 'Pause All Keys',
        message: `This will revoke ${activeCount} active key${activeCount !== 1 ? 's' : ''}. Protected keys (OWNER/ADMIN) are not affected. You can resume them anytime.`,
        confirmLabel: 'Pause All',
        confirmStyle: 'warning',
        onConfirm: async () => {
          hideModal()
          setPausingAll(true)
          await fetch('/api/keys', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'pause' }),
          })
          setPausingAll(false)
          onRefresh()
        },
      })
    }
  }

  async function toggleKey(id: string) {
    await fetch(`/api/keys/${id}`, { method: 'PATCH' })
    onRefresh()
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = keys
    .filter(k => {
      if (filterType === 'free') return isFreeKey(k.note)
      if (filterType === 'paid') return !isFreeKey(k.note)
      return true
    })
    .filter(k =>
      k.key.includes(search.toUpperCase()) ||
      displayNote(k.note).toLowerCase().includes(search.toLowerCase()) ||
      (k.device_id || '').toLowerCase().includes(search.toLowerCase())
    )

  const stats = {
    total:   keys.length,
    paid:    keys.filter(k => !isFreeKey(k.note)).length,
    free:    keys.filter(k => isFreeKey(k.note)).length,
    active:  keys.filter(k => k.is_active && new Date(k.expires_at) > new Date()).length,
    expired: keys.filter(k => new Date(k.expires_at) < new Date()).length,
  }

  return (
    <div>
      {/* Custom confirm modal */}
      {modal && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          confirmStyle={modal.confirmStyle}
          onConfirm={modal.onConfirm}
          onCancel={hideModal}
        />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Keys</div>
          <div className="page-subtitle">Generate and manage all license keys</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        {[
          { label: 'Total',   value: stats.total,   color: 'var(--text)'     },
          { label: 'Paid',    value: stats.paid,    color: '#fff'            },
          { label: 'Free',    value: stats.free,    color: 'var(--yellow)'   },
          { label: 'Valid',   value: stats.active,  color: 'var(--green)'    },
          { label: 'Expired', value: stats.expired, color: 'var(--text-dim)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Generate — seller bisa generate, tapi tidak bisa delete/revoke/pause */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-title">Generate Keys</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div className="field-label">Duration</div>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {([['preset','Preset'],['days','Custom Days'],['date','Pick Date']] as const).map(([m, lbl]) => (
                <button key={m}
                  className={durMode === m ? 'btn-primary' : 'btn-ghost'}
                  onClick={() => setDurMode(m)}
                  style={{ fontSize: 10, padding: '3px 9px', borderRadius: 5 }}>
                  {lbl}
                </button>
              ))}
            </div>
            {durMode === 'preset' && (
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
                {VALID_DURATIONS.map(d => {
                  const disc = discounts.find(x => x.is_active && x.duration_days === d &&
                    (!x.expires_at || new Date(x.expires_at) > new Date()) &&
                    (!x.slot_limit || x.slots_used < x.slot_limit))
                  return (
                    <option key={d} value={d}>
                      {durationLabel(d)}{disc ? ` — DISC ${disc.discount_pct}%` : ''}
                    </option>
                  )
                })}
              </select>
            )}
            {durMode === 'days' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min={1} max={36500} value={customDays}
                  onChange={e => setCustomDays(e.target.value)}
                  style={{ width: 100 }} />
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>days</span>
                {customDays && Number(customDays) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    → expires {new Date(Date.now() + Number(customDays) * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}
            {durMode === 'date' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="date"
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  style={{ width: 160 }} />
                {customDate && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {Math.ceil((new Date(customDate).getTime() - Date.now()) / 86400000)} days
                  </span>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="field-label">Count (max 50)</div>
            <input type="number" min={1} max={50} value={count}
              onChange={e => setCount(Number(e.target.value))} style={{ width: 90 }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="field-label">Note (optional)</div>
            <input placeholder={isFree ? 'e.g. tester / promo' : 'e.g. VIP user'} value={note}
              onChange={e => setNote(e.target.value)} />
          </div>

          {/* Free toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="field-label">Type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                padding: '9px 12px', borderRadius: 8,
                background: isFree ? 'rgba(245,158,11,0.1)' : 'var(--surface2)',
                border: `1px solid ${isFree ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                fontSize: 12, whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>
                <input type="radio" name="keytype" checked={!isFree && !isOwner}
                  onChange={() => { setIsFree(false); setIsOwner(false) }}
                  style={{ width: 'auto', accentColor: '#cc0000' }} />
                <span style={{ color: !isFree && !isOwner ? '#fff' : 'var(--text-dim)', fontWeight: !isFree && !isOwner ? 600 : 400 }}>
                  Paid
                </span>
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                padding: '9px 12px', borderRadius: 8,
                background: isFree ? 'rgba(245,158,11,0.1)' : 'var(--surface2)',
                border: `1px solid ${isFree ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                fontSize: 12, whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>
                <input type="radio" name="keytype" checked={isFree}
                  onChange={() => { setIsFree(true); setIsOwner(false) }}
                  style={{ width: 'auto', accentColor: '#f59e0b' }} />
                <span style={{ color: isFree ? 'var(--yellow)' : 'var(--text-dim)', fontWeight: isFree ? 600 : 400 }}>
                  Free
                </span>
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                padding: '9px 12px', borderRadius: 8,
                background: isOwner ? 'rgba(204,0,0,0.1)' : 'var(--surface2)',
                border: `1px solid ${isOwner ? 'rgba(204,0,0,0.4)' : 'var(--border)'}`,
                fontSize: 12, whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>
                <input type="radio" name="keytype" checked={isOwner}
                  onChange={() => { setIsOwner(true); setIsFree(false) }}
                  style={{ width: 'auto', accentColor: '#cc0000' }} />
                <span style={{ color: isOwner ? '#ff5555' : 'var(--text-dim)', fontWeight: isOwner ? 600 : 400 }}>
                  Owner
                </span>
              </label>
            </div>
          </div>

          <button className={isFree || isOwner ? 'btn-ghost' : 'btn-primary'} onClick={generateKeys}
            disabled={generating}
            style={{
              padding: '10px 22px', whiteSpace: 'nowrap', borderRadius: 10,
              border: isOwner ? '1px solid rgba(204,0,0,0.4)' : isFree ? '1px solid rgba(245,158,11,0.4)' : undefined,
              color: isOwner ? '#ff5555' : isFree ? 'var(--yellow)' : undefined,
            }}>
            {generating ? 'Generating…' : `Generate ${count > 1 ? `${count} Keys` : 'Key'}${isOwner ? ' (Owner)' : isFree ? ' (Free)' : ''}`}
          </button>
        </div>

        {isFree && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--yellow)' }}>
            Free keys are not counted in revenue.
          </div>
        )}
        {isOwner && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#ff5555' }}>
            Owner keys are not counted in revenue — for personal/internal use only.
          </div>
        )}
        {genError && <div className="error-banner">Failed to generate keys: {genError}</div>}
      </div>

      {/* Keys Table */}
      <div className="panel panel--flush">
        <div className="table-header">
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.04em' }}>
            ALL KEYS <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({filtered.length})</span>
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Pause All / Resume All — hidden for seller */}
            {role !== 'seller' && (() => {
              const activeCount = keys.filter(k => k.is_active && !(k.note||'').startsWith('OWNER:') && !(k.note||'').startsWith('ADMIN:')).length
              const pausedCount = keys.filter(k => !k.is_active && !(k.note||'').startsWith('OWNER:') && !(k.note||'').startsWith('ADMIN:')).length
              const allPaused   = activeCount === 0 && pausedCount > 0
              const label = pausingAll ? (allPaused ? 'Resuming…' : 'Pausing…') : (allPaused ? 'Resume All Keys' : 'Pause All Keys')
              const isDisabled  = pausingAll || (activeCount === 0 && pausedCount === 0)
              return (
                <button
                  onClick={confirmPauseAll}
                  disabled={isDisabled}
                  style={{
                    fontSize: 11, padding: '5px 12px', borderRadius: 7,
                    background: allPaused ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${allPaused ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'}`,
                    color: allPaused ? 'var(--green)' : 'var(--yellow)',
                    fontWeight: 600, cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.4 : 1, whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                  }}>
                  {label}
                </button>
              )
            })()}
            {/* Filter */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'paid', 'free'] as const).map(t => (
                <button key={t}
                  className={filterType === t ? 'btn-primary' : 'btn-ghost'}
                  onClick={() => setFilterType(t)}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, textTransform: 'capitalize' }}>
                  {t}
                </button>
              ))}
            </div>
            <input placeholder="Search key, note, device…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No keys found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Key', 'Type', 'Duration', 'Status', 'Created', 'Expires', 'Device', ...(role !== 'seller' ? ['Actions'] : [])].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(k => {
                  const status = keyStatus(k)
                  const free = isFreeKey(k.note)
                  const owner = isOwnerKey(k.note)
                  return (
                    <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code style={{ fontFamily: 'monospace', fontSize: 12, color: '#fff', letterSpacing: '0.04em' }}>{k.key}</code>
                          <button className="btn-ghost" onClick={() => copyKey(k.key)}
                            style={{ fontSize: 11, padding: '3px 8px' }}>
                            {copied === k.key ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        {displayNote(k.note) && (
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{displayNote(k.note)}</div>
                        )}
                        {(owner) && (
                          <div style={{ fontSize: 10, color: '#ff5555', marginTop: 2, letterSpacing: '0.05em' }}>OWNER KEY</div>
                        )}
                      </td>
                      <td className="td">
                        <span className={`badge ${owner ? 'badge-red' : free ? 'badge-yellow' : 'badge-gray'}`}>
                          {owner ? 'Owner' : free ? 'Free' : 'Paid'}
                        </span>
                      </td>
                      <td className="td" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{durationLabel(k.duration_days)}</td>
                      <td className="td"><span className={`badge ${status.badge}`}>{status.label}</span></td>
                      <td className="td" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmt(k.created_at)}</td>
                      <td className="td" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmt(k.expires_at)}</td>
                      <td className="td" style={{ color: 'var(--text-dim)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {k.device_id ? <code style={{ fontSize: 11 }}>{k.device_id.substring(0, 16)}…</code> : '—'}
                      </td>
                      <td className="td">
                        <div style={{ display: 'flex', gap: 6 }}>
                          {role !== 'seller' && (
                            <button className="btn-ghost" onClick={() => toggleKey(k.id)} style={{ fontSize: 11, padding: '4px 10px' }}>
                              {k.is_active ? 'Revoke' : 'Enable'}
                            </button>
                          )}
                          {role !== 'seller' && (
                            <button
                              onClick={() => confirmDelete(k.id, k.key)}
                              style={{
                                fontSize: 11, padding: '4px 10px', borderRadius: 7,
                                background: 'transparent',
                                border: '1px solid rgba(255,68,68,0.35)',
                                color: '#ff6666', cursor: 'pointer', fontFamily: 'inherit',
                              }}>
                              Delete
                            </button>
                          )}
                          {role === 'seller' && (
                            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>—</span>
                          )}
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
  )
}

// ─── License Tab ──────────────────────────────────────────────────────────────
function LicenseTab({ keys }: { keys: Key[] }) {
  const paidKeys = keys.filter(k => !isFreeKey(k.note))
  const freeKeys = keys.filter(k => isFreeKey(k.note))

  const groups = [
    {
      label: 'Active — Paid',
      items: paidKeys.filter(k => k.is_active && new Date(k.expires_at) > new Date() && k.activated_at),
      badge: 'badge-green',
    },
    {
      label: 'Unused — Paid',
      items: paidKeys.filter(k => k.is_active && new Date(k.expires_at) > new Date() && !k.activated_at),
      badge: 'badge-yellow',
    },
    {
      label: 'Active — Free',
      items: freeKeys.filter(k => k.is_active && new Date(k.expires_at) > new Date() && k.activated_at),
      badge: 'badge-green',
    },
    {
      label: 'Unused — Free',
      items: freeKeys.filter(k => k.is_active && new Date(k.expires_at) > new Date() && !k.activated_at),
      badge: 'badge-yellow',
    },
    {
      label: 'Expired',
      items: keys.filter(k => new Date(k.expires_at) < new Date()),
      badge: 'badge-red',
    },
    {
      label: 'Revoked',
      items: keys.filter(k => !k.is_active),
      badge: 'badge-gray',
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">License</div>
          <div className="page-subtitle">Overview of all license statuses</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Licenses',  value: keys.length,      color: 'var(--text)'   },
          { label: 'Paid Licenses',   value: paidKeys.length,  color: '#fff'          },
          { label: 'Free Licenses',   value: freeKeys.length,  color: 'var(--yellow)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {groups.map(g => g.items.length > 0 && (
        <div key={g.label} className="panel panel--flush" style={{ marginBottom: 18 }}>
          <div className="table-header">
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
              {g.label.toUpperCase()} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({g.items.length})</span>
            </span>
            <span className={`badge ${g.badge}`}>{g.items.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Key', 'Duration', 'Device', 'Expires'].map(h => <th key={h} className="th">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {g.items.map(k => (
                  <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="td">
                      <code style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.04em' }}>{k.key}</code>
                      {displayNote(k.note) && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{displayNote(k.note)}</div>
                      )}
                    </td>
                    <td className="td" style={{ color: 'var(--text-dim)' }}>{durationLabel(k.duration_days)}</td>
                    <td className="td" style={{ color: 'var(--text-dim)' }}>
                      {k.device_id ? <code style={{ fontSize: 11 }}>{k.device_id.substring(0, 16)}…</code> : '—'}
                    </td>
                    <td className="td" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmt(k.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Revenue Tab ──────────────────────────────────────────────────────────────
function RevenueTab({ keys }: { keys: Key[] }) {
  // Only paid (non-free) keys count toward revenue
  const paidKeys = keys.filter(k => !isFreeKey(k.note))

  // Total potential revenue (all paid keys ever generated)
  const totalRevenue = paidKeys.reduce((sum, k) => sum + (KEY_PRICES[k.duration_days] || 0), 0)

  // Revenue from activated keys only
  const activatedRevenue = paidKeys
    .filter(k => k.activated_at)
    .reduce((sum, k) => sum + (KEY_PRICES[k.duration_days] || 0), 0)

  // Pending (unused, not expired, not revoked)
  const pendingRevenue = paidKeys
    .filter(k => !k.activated_at && k.is_active && new Date(k.expires_at) > new Date())
    .reduce((sum, k) => sum + (KEY_PRICES[k.duration_days] || 0), 0)

  // Lost (expired or revoked, never activated)
  const lostRevenue = paidKeys
    .filter(k => !k.activated_at && (!k.is_active || new Date(k.expires_at) < new Date()))
    .reduce((sum, k) => sum + (KEY_PRICES[k.duration_days] || 0), 0)

  // Per-duration breakdown (paid only)
  const byDuration: Record<string, { count: number; revenue: number }> = {}
  paidKeys.forEach(k => {
    const label = durationLabel(k.duration_days)
    if (!byDuration[label]) byDuration[label] = { count: 0, revenue: 0 }
    byDuration[label].count++
    byDuration[label].revenue += KEY_PRICES[k.duration_days] || 0
  })

  // Monthly revenue (last 6 months, paid activated keys)
  const monthly: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    monthly[d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })] = 0
  }
  paidKeys
    .filter(k => k.activated_at)
    .forEach(k => {
      const label = new Date(k.activated_at!).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      if (label in monthly) monthly[label] += KEY_PRICES[k.duration_days] || 0
    })
  const maxMonthly = Math.max(...Object.values(monthly), 1)

  // Free key count for reference
  const freeCount = keys.filter(k => isFreeKey(k.note)).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Revenue</div>
          <div className="page-subtitle">Income from paid license keys — free keys are excluded</div>
        </div>
      </div>

      {/* Main revenue cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 20 }}>
        <div className="stat-card" style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Realized Revenue</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{fmtIDR(activatedRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>From {paidKeys.filter(k => k.activated_at).length} activated paid keys</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Pending Revenue</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--yellow)' }}>{fmtIDR(pendingRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>From {paidKeys.filter(k => !k.activated_at && k.is_active && new Date(k.expires_at) > new Date()).length} unused active keys</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Total Generated</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{fmtIDR(totalRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>{paidKeys.length} paid keys total</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Lost / Expired</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>{fmtIDR(lostRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Keys never used</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Free Keys (excluded)</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--yellow)' }}>{freeCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Not counted in revenue</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
        {/* By duration */}
        <div className="panel">
          <div className="panel-title">Revenue by Duration</div>
          {Object.keys(byDuration).length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No paid keys yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(byDuration)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([label, info]) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{fmtIDR(info.revenue)} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({info.count} keys)</span></span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', background: 'var(--green)', borderRadius: 4,
                        width: `${Math.round((info.revenue / totalRevenue) * 100)}%`,
                        transition: 'width 0.4s',
                      }} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Monthly bar chart */}
        <div className="panel">
          <div className="panel-title">Monthly Revenue (Last 6 Months)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110 }}>
            {Object.entries(monthly).map(([month, amount]) => (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                {amount > 0 && (
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 600, textAlign: 'center' }}>
                    {(amount / 1000).toFixed(0)}k
                  </div>
                )}
                <div style={{
                  width: '100%',
                  background: amount > 0 ? 'var(--green)' : 'var(--surface2)',
                  borderRadius: '4px 4px 0 0',
                  height: `${Math.round((amount / maxMonthly) * 72) + (amount > 0 ? 6 : 4)}px`,
                  minHeight: 4,
                  transition: 'height 0.4s',
                }} />
                <div style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.2 }}>{month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Paid key transaction list */}
      <div className="panel panel--flush">
        <div className="table-header">
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
            PAID KEY TRANSACTIONS <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({paidKeys.length})</span>
          </span>
        </div>
        {paidKeys.length === 0 ? (
          <div className="empty-state">No paid keys yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Key', 'Duration', 'Price', 'Status', 'Created', 'Note'].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paidKeys.map(k => {
                  const status = keyStatus(k)
                  return (
                    <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="td">
                        <code style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.04em' }}>{k.key}</code>
                      </td>
                      <td className="td" style={{ color: 'var(--text-dim)' }}>{durationLabel(k.duration_days)}</td>
                      <td className="td" style={{ fontWeight: 600, color: '#ffffff' }}>{fmtIDR(KEY_PRICES[k.duration_days] || 0)}
                      </td>
                      <td className="td"><span className={`badge ${status.badge}`}>{status.label}</span></td>
                      <td className="td" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmt(k.created_at)}</td>
                      <td className="td" style={{ color: 'var(--text-dim)', fontSize: 12 }}>{displayNote(k.note) || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ keys }: { keys: Key[] }) {
  const paidKeys = keys.filter(k => !isFreeKey(k.note))
  const freeKeys = keys.filter(k => isFreeKey(k.note))
  const total     = keys.length
  const active    = keys.filter(k => k.is_active && new Date(k.expires_at) > new Date()).length
  const activated = keys.filter(k => k.activated_at).length
  const expired   = keys.filter(k => new Date(k.expires_at) < new Date()).length
  const revoked   = keys.filter(k => !k.is_active).length
  const unused    = keys.filter(k => k.is_active && !k.activated_at && new Date(k.expires_at) > new Date()).length

  const activationRate = total > 0 ? Math.round((activated / total) * 100) : 0
  const expiryRate     = total > 0 ? Math.round((expired / total) * 100) : 0

  // Duration breakdown (paid vs free)
  const durationMap: Record<string, { paid: number; free: number }> = {}
  keys.forEach(k => {
    const label = durationLabel(k.duration_days)
    if (!durationMap[label]) durationMap[label] = { paid: 0, free: 0 }
    if (isFreeKey(k.note)) durationMap[label].free++
    else durationMap[label].paid++
  })

  // Last 7 days
  const last7: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    last7[d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })] = 0
  }
  keys.forEach(k => {
    const label = new Date(k.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    if (label in last7) last7[label]++
  })
  const maxBar = Math.max(...Object.values(last7), 1)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-subtitle">Key usage stats and trends</div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total',           value: total,               color: 'var(--text)'     },
          { label: 'Paid',            value: paidKeys.length,     color: '#fff'            },
          { label: 'Free',            value: freeKeys.length,     color: 'var(--yellow)'   },
          { label: 'Valid',           value: active,              color: 'var(--green)'    },
          { label: 'Activated',       value: activated,           color: '#fff'            },
          { label: 'Unused',          value: unused,              color: 'var(--yellow)'   },
          { label: 'Expired',         value: expired,             color: 'var(--red)'      },
          { label: 'Revoked',         value: revoked,             color: 'var(--text-dim)' },
          { label: 'Activation Rate', value: `${activationRate}%`, color: 'var(--green)'  },
          { label: 'Expiry Rate',     value: `${expiryRate}%`,    color: 'var(--red)'      },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
        {/* Duration breakdown */}
        <div className="panel">
          <div className="panel-title">Keys by Duration</div>
          {Object.entries(durationMap).length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(durationMap)
                .sort((a, b) => (b[1].paid + b[1].free) - (a[1].paid + a[1].free))
                .map(([label, counts]) => {
                  const rowTotal = counts.paid + counts.free
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                        <span style={{ fontWeight: 600 }}>
                          {rowTotal}
                          <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                            {' '}({counts.paid} paid / {counts.free} free)
                          </span>
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ height: '100%', background: 'var(--green)', width: `${Math.round((counts.paid / total) * 100)}%`, transition: 'width 0.4s' }} />
                        <div style={{ height: '100%', background: 'var(--yellow)', width: `${Math.round((counts.free / total) * 100)}%`, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 11, color: 'var(--text-dim)' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--green)', marginRight: 4 }} />Paid</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--yellow)', marginRight: 4 }} />Free</span>
          </div>
        </div>

        {/* Last 7 days */}
        <div className="panel">
          <div className="panel-title">Keys Generated (Last 7 Days)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
            {Object.entries(last7).map(([day, count]) => (
              <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                {count > 0 && <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>{count}</div>}
                <div style={{
                  width: '100%',
                  background: count > 0 ? 'var(--green)' : 'var(--surface2)',
                  borderRadius: '4px 4px 0 0',
                  height: `${Math.round((count / maxBar) * 70) + (count > 0 ? 6 : 4)}px`,
                  minHeight: 4, transition: 'height 0.4s',
                }} />
                <div style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.2 }}>{day}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Activity Log Tab ─────────────────────────────────────────────────────────
function ActivityTab({ keys }: { keys: Key[] }) {
  const events: { time: string; type: 'generated' | 'activated' | 'revoked'; text: string; badge: string }[] = []

  keys.forEach(k => {
    const free = isFreeKey(k.note)
    events.push({
      time: k.created_at,
      type: 'generated',
      text: `Key ${k.key} generated${free ? ' (Free)' : ''}${displayNote(k.note) ? ` — ${displayNote(k.note)}` : ''}`,
      badge: free ? 'badge-yellow' : 'badge-gray',
    })
    if (k.activated_at) {
      events.push({
        time: k.activated_at,
        type: 'activated',
        text: `Key ${k.key} activated on device ${k.device_id?.substring(0, 12) ?? ''}…`,
        badge: 'badge-green',
      })
    }
    if (!k.is_active) {
      events.push({
        time: k.created_at,
        type: 'revoked',
        text: `Key ${k.key} revoked`,
        badge: 'badge-red',
      })
    }
  })

  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const recent = events.slice(0, 60)

  const typeLabel: Record<string, string> = {
    generated: 'GENERATED',
    activated: 'ACTIVATED',
    revoked:   'REVOKED',
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Activity Log</div>
          <div className="page-subtitle">Recent events across all license keys</div>
        </div>
      </div>

      <div className="panel panel--flush">
        <div className="table-header">
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
            RECENT EVENTS <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({recent.length})</span>
          </span>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">No activity yet</div>
        ) : (
          <div>
            {recent.map((e, i) => (
              <div key={i} style={{
                padding: '12px 22px',
                borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                <span className={`badge ${e.badge}`} style={{ minWidth: 72, textAlign: 'center', flexShrink: 0 }}>
                  {typeLabel[e.type]}
                </span>
                <div style={{ flex: 1, fontSize: 13 }}>{e.text}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  {new Date(e.time).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ role }: { role: 'admin' | 'owner' | null }) {
  const [copied, setCopied] = useState(false)

  function copySnippet(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const endpoints = [
    { method: 'POST',   path: '/api/login',     desc: 'Authenticate and get a session cookie' },
    { method: 'GET',    path: '/api/keys',      desc: 'Fetch all license keys' },
    { method: 'POST',   path: '/api/keys',      desc: 'Generate new keys' },
    { method: 'PATCH',  path: '/api/keys/:id',  desc: 'Toggle revoke/enable a key' },
    { method: 'DELETE', path: '/api/keys/:id',  desc: 'Delete a key permanently' },
    { method: 'POST',   path: '/api/validate',  desc: 'Validate a license key by device' },
    { method: 'POST',   path: '/api/logout',    desc: 'Clear the session cookie' },
  ]

  const methodColor: Record<string, string> = {
    GET: 'var(--green)', POST: '#60a5fa', PATCH: 'var(--yellow)', DELETE: 'var(--red)',
  }

  const prices = [
    { label: '1 Day',    price: 25000 },
    { label: '3 Days',   price: 35000 },
    { label: '7 Days',   price: 60000 },
    { label: '30 Days',  price: 170000 },
    { label: '40 Days',  price: 200000 },
    { label: 'Lifetime', price: 500000 },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Account info, pricing, and API reference</div>
        </div>
      </div>

      {/* Account */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-title">Account</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="settings-row">
            <span className="settings-row-label">Role</span>
            <span className={`badge ${role === 'owner' ? 'badge-white' : 'badge-gray'}`} style={{ textTransform: 'uppercase' }}>{role}</span>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">Session</span>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>JWT — expires in 24 hours</span>
          </div>
        </div>
      </div>

      {/* Pricing table */}
      <div className="panel panel--flush" style={{ marginBottom: 20 }}>
        <div className="table-header">
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>PRICING LIST</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Duration', 'Price per Key'].map(h => <th key={h} className="th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {prices.map(p => (
                <tr key={p.label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="td">{p.label}</td>
                  <td className="td" style={{ fontWeight: 600, color: '#ffffff' }}>{fmtIDR(p.price)}</td>
                </tr>
              ))}
              <tr>
                <td className="td" style={{ color: 'var(--text-dim)' }}>Free (any duration)</td>
                <td className="td"><span className="badge badge-yellow">Rp 0 — not counted in revenue</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* API endpoints */}
      <div className="panel panel--flush" style={{ marginBottom: 20 }}>
        <div className="table-header">
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>API ENDPOINTS</span>
        </div>
        <div>
          {endpoints.map((ep, i) => (
            <div key={i} style={{
              padding: '12px 22px',
              borderBottom: i < endpoints.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: methodColor[ep.method] || 'var(--text)', minWidth: 52, textAlign: 'right' }}>
                {ep.method}
              </span>
              <code style={{ fontSize: 12, color: '#fff', background: 'var(--surface2)', padding: '3px 10px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                {ep.path}
              </code>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-dim)' }}>{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Validate snippet */}
      <div className="panel">
        <div className="panel-title">Integration Example</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Call <code style={{ color: '#fff', background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>/api/validate</code> from your app:
        </div>
        <div style={{ position: 'relative' }}>
          <pre style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 18px', fontSize: 12,
            color: 'var(--text)', overflowX: 'auto', lineHeight: 1.6,
          }}>{`POST /api/validate
Content-Type: application/json

{
  "key": "XXXX-XXXX-XXXX-XXXX",
  "device_id": "<unique-device-id>"
}`}</pre>
          <button className="btn-ghost"
            onClick={() => copySnippet('POST /api/validate\nContent-Type: application/json\n\n{\n  "key": "XXXX-XXXX-XXXX-XXXX",\n  "device_id": "<unique-device-id>"\n}')}
            style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, padding: '4px 10px' }}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [keys, setKeys] = useState<Key[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<Role>(null)
  const [activePage, setActivePage] = useState<SidebarPage>('keys')
  const [discounts, setDiscounts] = useState<Discount[]>([])

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/keys')
    if (res.status === 401) { router.push('/'); return }
    const data = await res.json()
    setKeys(data.keys || [])
    setRole(data.role || 'admin')
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
    fetchKeys()
    fetchDiscounts()
  }, [fetchKeys, fetchDiscounts])

  // Seller: keys + license only. Admin: semua kecuali settings & admin panel
  const SELLER_ALLOWED: SidebarPage[] = ['keys', 'license']
  const ADMIN_ALLOWED:  SidebarPage[] = ['keys', 'license', 'revenue', 'analytics', 'activity']

  function handleNavigate(page: SidebarPage) {
    if (page === 'admin') { router.push('/owner'); return }
    if (role === 'seller' && !SELLER_ALLOWED.includes(page)) return
    if (role === 'admin'  && !ADMIN_ALLOWED.includes(page))  return
    setActivePage(page)
  }

  const getAllowed = (): SidebarPage[] => {
    if (role === 'seller') return SELLER_ALLOWED
    if (role === 'admin')  return ADMIN_ALLOWED
    return ['keys','license','revenue','analytics','activity','settings','admin']
  }
  const safePage = getAllowed().includes(activePage) ? activePage : 'keys'

  return (
    <DashboardLayout activePage={safePage} onNavigate={handleNavigate} role={role}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 28px' }}>
        {safePage === 'keys'      && <KeysTab      keys={keys} loading={loading} role={role} onRefresh={fetchKeys} discounts={discounts} />}
        {safePage === 'license'   && <LicenseTab   keys={keys} />}
        {safePage === 'revenue'   && <RevenueTab   keys={keys} />}
        {safePage === 'analytics' && <AnalyticsTab keys={keys} />}
        {safePage === 'activity'  && <ActivityTab  keys={keys} />}
        {safePage === 'settings'  && role === 'owner' && <SettingsTab role={role} />}
      </div>
    </DashboardLayout>
  )
}

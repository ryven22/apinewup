import { v4 as uuidv4 } from 'uuid'

// Valid durations — use 0 as sentinel for "lifetime" (no expiry)
export const VALID_DURATIONS = [1, 3, 7, 30, 40, 0] as const
export type DurationDays = typeof VALID_DURATIONS[number]

// Lifetime = 100 years effectively
const LIFETIME_DAYS = 36500

// Price list per key (IDR)
// FREE keys (note starts with "FREE:") are excluded from revenue
export const KEY_PRICES: Record<number, number> = {
  1:     25000,
  3:     35000,
  7:     60000,
  30:   170000,
  40:   200000,
  0:    500000, // lifetime
}

// Format: XXXX-XXXX-XXXX-XXXX (random, no prefix)
export function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg()}-${seg()}-${seg()}-${seg()}`
}

export function daysToExpiry(days: number): string {
  const date = new Date()
  const actual = days === 0 ? LIFETIME_DAYS : days
  date.setDate(date.getDate() + actual)
  return date.toISOString()
}

// Convert a specific date string (YYYY-MM-DD) to ISO expiry
export function dateToExpiry(dateStr: string): string {
  const d = new Date(dateStr)
  d.setHours(23, 59, 59, 0)
  return d.toISOString()
}

export function durationLabel(days: number): string {
  switch (days) {
    case 0:  return 'Lifetime'
    case 1:  return '1 Day'
    case 3:  return '3 Days'
    case 7:  return '7 Days'
    case 30: return '30 Days'
    case 40: return '40 Days'
    default: return `${days} Day${days !== 1 ? 's' : ''}`
  }
}

export function priceLabel(days: number): string {
  const price = KEY_PRICES[days]
  if (!price) return 'Free'
  return `Rp ${price.toLocaleString('id-ID')}`
}

// A key is "free" if its note starts with FREE: prefix
export function isFreeKey(note: string | null): boolean {
  return (note || '').startsWith('FREE:')
}

// A key is "owner key" if its note starts with OWNER: prefix
// Owner keys are not counted in revenue (made by owner for personal use)
export function isOwnerKey(note: string | null): boolean {
  return (note || '').startsWith('OWNER:')
}

// Returns true if key should be excluded from revenue
export function isNonRevenueKey(note: string | null): boolean {
  return isFreeKey(note) || isOwnerKey(note)
}

// Strip prefixes when displaying note
export function displayNote(note: string | null): string {
  if (!note) return ''
  if (note.startsWith('FREE:'))  return note.slice(5).trim()
  if (note.startsWith('OWNER:')) return note.slice(6).trim()
  return note
}

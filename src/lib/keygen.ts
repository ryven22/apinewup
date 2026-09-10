import { v4 as uuidv4 } from 'uuid'

// Valid durations — use 0 as sentinel for "lifeteam" (no expiry)
export const VALID_DURATIONS = [1, 3, 7, 30, 40, 0] as const
export type DurationDays = typeof VALID_DURATIONS[number]

// Lifeteam = year 9999 effectively (never expires in practice)
const LIFETEAM_DAYS = 36500 // 100 years

// Format: MT-XXXX-XXXX-XXXX
export function generateKey(): string {
  const raw = uuidv4().replace(/-/g, '').toUpperCase()
  const part1 = raw.substring(0, 4)
  const part2 = raw.substring(4, 8)
  const part3 = raw.substring(8, 12)
  return `MT-${part1}-${part2}-${part3}`
}

export function daysToExpiry(days: number): string {
  const date = new Date()
  const actual = days === 0 ? LIFETEAM_DAYS : days
  date.setDate(date.getDate() + actual)
  return date.toISOString()
}

export function durationLabel(days: number): string {
  switch (days) {
    case 0:  return 'Lifeteam'
    case 1:  return '1 Day'
    case 3:  return '3 Days'
    case 7:  return '7 Days'
    case 30: return '30 Days'
    case 40: return '40 Days'
    default: return `${days} Days`
  }
}

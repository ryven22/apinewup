import { v4 as uuidv4 } from 'uuid'

// Format: REGS-XXXX-XXXX-XXXX
export function generateKey(): string {
  const raw = uuidv4().replace(/-/g, '').toUpperCase()
  const part1 = raw.substring(0, 4)
  const part2 = raw.substring(4, 8)
  const part3 = raw.substring(8, 12)
  return `REGS-${part1}-${part2}-${part3}`
}

export function daysToExpiry(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

// Shared with the Flutter app's `VenueSchedule`/`DaySchedule` format
// (lib/core/models/venue_schedule.dart) — keys are ISO weekday numbers
// (1=Monday … 7=Sunday) so `venues.opening_hours` stays readable by both apps.

export type TimeSlot = { openTime: string; closeTime: string }
export type DaySchedule = { isOpen: boolean; slots: TimeSlot[] }
export type Hours = Record<string, DaySchedule>

export const WEEKDAYS: { day: number; label: string }[] = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 7, label: 'Sunday' },
]

const DEFAULT_SLOT: TimeSlot = { openTime: '09:00', closeTime: '22:00' }

const LEGACY_DAY_NUM: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7,
}

export function defaultHours(): Hours {
  return Object.fromEntries(
    WEEKDAYS.map(({ day }) => [String(day), { isOpen: true, slots: [{ ...DEFAULT_SLOT }] }]),
  )
}

// Reads the current {"1": {isOpen, slots:[...]}} shape, and migrates the
// older {"Monday": {open, from, to}} shape this form used to write.
export function parseHours(raw: string | null | undefined): Hours {
  const hours = defaultHours()
  if (!raw) return hours
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(raw) } catch { return hours }

  for (const [key, value] of Object.entries(parsed)) {
    if (!value || typeof value !== 'object') continue
    const v = value as Record<string, unknown>
    const day = LEGACY_DAY_NUM[key] ?? (/^[1-7]$/.test(key) ? Number(key) : null)
    if (!day) continue

    if (Array.isArray(v.slots)) {
      hours[String(day)] = {
        isOpen: typeof v.isOpen === 'boolean' ? v.isOpen : true,
        slots: (v.slots as Record<string, unknown>[]).map(s => ({
          openTime: (s.openTime as string) ?? DEFAULT_SLOT.openTime,
          closeTime: (s.closeTime as string) ?? DEFAULT_SLOT.closeTime,
        })),
      }
    } else if ('from' in v || 'to' in v || 'open' in v) {
      const isOpen = typeof v.open === 'boolean' ? v.open : true
      hours[String(day)] = {
        isOpen,
        slots: isOpen ? [{ openTime: (v.from as string) ?? DEFAULT_SLOT.openTime, closeTime: (v.to as string) ?? DEFAULT_SLOT.closeTime }] : [],
      }
    }
  }
  return hours
}

export function encodeHours(hours: Hours): string {
  return JSON.stringify(hours)
}

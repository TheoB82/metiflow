'use client'
import { WEEKDAYS, type Hours, type TimeSlot } from '@/lib/openingHours'

export function HoursEditor({ hours, onChange }: { hours: Hours; onChange: (h: Hours) => void }) {
  function setDay(day: number, patch: Partial<Hours[string]>) {
    onChange({ ...hours, [day]: { ...hours[String(day)], ...patch } })
  }
  function updateSlot(day: number, idx: number, patch: Partial<TimeSlot>) {
    const d = hours[String(day)]
    setDay(day, { slots: d.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)) })
  }
  function addSlot(day: number) {
    const d = hours[String(day)]
    setDay(day, { slots: [...d.slots, { openTime: '18:00', closeTime: '22:00' }] })
  }
  function removeSlot(day: number, idx: number) {
    const d = hours[String(day)]
    setDay(day, { slots: d.slots.filter((_, i) => i !== idx) })
  }
  // Copies a day's open/closed state and time ranges onto every day after
  // it (Tue copies to Wed–Sun, Wed to Thu–Sun, etc.) — the common case is
  // "same hours all week except Sunday", so copying forward from the first
  // day usually sets the whole week in one tap; days already visited can
  // still be adjusted individually afterwards.
  function copyToRest(day: number) {
    const source = hours[String(day)]
    const next: Hours = { ...hours }
    for (let d = day + 1; d <= 7; d++) {
      next[String(d)] = { isOpen: source.isOpen, slots: source.slots.map(s => ({ ...s })) }
    }
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {WEEKDAYS.map(({ day, label }) => {
        const d = hours[String(day)] ?? { isOpen: true, slots: [] }
        return (
          <div key={day} style={{
            padding: '0.5rem 0.75rem', border: '1.5px solid var(--border)', borderRadius: 8,
            background: d.isOpen ? 'var(--surface)' : '#f8fafc',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                <input
                  type="checkbox"
                  checked={d.isOpen}
                  onChange={e => setDay(day, {
                    isOpen: e.target.checked,
                    slots: e.target.checked && d.slots.length === 0 ? [{ openTime: '09:00', closeTime: '22:00' }] : d.slots,
                  })}
                  style={{ accentColor: 'var(--brand)', width: 15, height: 15 }}
                />
                {label}
              </label>
              {!d.isOpen && <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Closed</span>}
              {day < 7 && (
                <button
                  type="button"
                  onClick={() => copyToRest(day)}
                  title="Copy these hours to every day below"
                  style={{
                    marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', fontSize: '0.75rem', padding: '2px 4px',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  Copy to rest of week ↓
                </button>
              )}
            </div>

            {d.isOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', paddingLeft: 24, marginTop: 6 }}>
                {d.slots.map((slot, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="time" value={slot.openTime} onChange={e => updateSlot(day, i, { openTime: e.target.value })}
                      style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }} />
                    <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>–</span>
                    <input type="time" value={slot.closeTime} onChange={e => updateSlot(day, i, { closeTime: e.target.value })}
                      style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }} />
                    {d.slots.length > 1 && (
                      <button type="button" onClick={() => removeSlot(day, i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8125rem', padding: '0 0.25rem' }}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addSlot(day)}
                  style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: '0.8125rem', fontWeight: 600, padding: '0.125rem 0' }}>
                  + Add time range (e.g. lunch / dinner)
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

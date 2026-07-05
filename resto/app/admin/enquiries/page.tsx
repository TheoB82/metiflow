'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/Logo'

const ADMIN_EMAIL = 'admin@metiflow.com'

type Enquiry = {
  id: string
  created_at: string
  name: string
  venue: string
  email: string
  venues: string | null
  pos_points: number | null
  tables: number | null
  covers: number | null
  message: string | null
  photo_urls: string[] | null
}

export default function AdminEnquiriesPage() {
  const router = useRouter()
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Enquiry | null>(null)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) { router.push('/login'); return }

      const { data } = await sb.from('enquiries')
        .select('*')
        .order('created_at', { ascending: false })
      setEnquiries(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-3)' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)' }}>
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', height: 60,
      }}>
        <Logo size={32} compact />
        <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>›</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Enquiries</span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: 99,
          background: '#fef3c7', color: '#b45309',
        }}>Admin</span>
        <button onClick={async () => { const sb = createClient(); await sb.auth.signOut(); window.location.href = '/login' }}
          style={{ fontSize: '0.875rem', color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '0.375rem 0.75rem', cursor: 'pointer' }}>
          Sign out
        </button>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', gap: '1.5rem' }}>

        {/* List */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              Enquiries
              <span style={{ marginLeft: 8, fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-3)' }}>
                {enquiries.length} total
              </span>
            </h1>
          </div>

          {enquiries.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
              No enquiries yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {enquiries.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  style={{
                    all: 'unset', cursor: 'pointer', display: 'block',
                    background: selected?.id === e.id ? 'var(--brand-light)' : 'var(--surface)',
                    border: `1.5px solid ${selected?.id === e.id ? 'var(--brand)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '0.875rem 1rem', textAlign: 'left',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{e.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: 2 }}>{e.venue}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {fmt(e.created_at)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--brand)', marginTop: 4 }}>{e.email}</div>
                  {e.message && (
                    <div style={{
                      fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 6,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{e.message}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ width: 320, flexShrink: 0 }}>
            <div className="card" style={{ position: 'sticky', top: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Details</h2>
                <button onClick={() => setSelected(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-3)', fontSize: '1.25rem', lineHeight: 1, padding: 0,
                }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Row label="Name"    value={selected.name} />
                <Row label="Venue"   value={selected.venue} />
                <Row label="Email"   value={selected.email} link={`mailto:${selected.email}`} />
                <Row label="Submitted" value={fmt(selected.created_at)} />

                {selected.venues    && <Row label="Venues"     value={selected.venues} />}
                {selected.pos_points != null && <Row label="POS points" value={String(selected.pos_points)} />}
                {selected.tables    != null && <Row label="Tables"     value={String(selected.tables)} />}
                {selected.covers    != null && <Row label="Covers"     value={String(selected.covers)} />}

                {selected.message && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Message</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{selected.message}</div>
                  </div>
                )}

                {selected.photo_urls && selected.photo_urls.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Attachments ({selected.photo_urls.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {selected.photo_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" style={{
                          fontSize: '0.8125rem', color: 'var(--brand)', textDecoration: 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          📎 Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <a href={`mailto:${selected.email}?subject=Re: Your Metiflow Resto enquiry`} style={{
                display: 'block', marginTop: '1.25rem', padding: '0.625rem 1rem',
                background: 'var(--brand)', color: '#fff', borderRadius: 8,
                fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', textAlign: 'center',
              }}>
                Reply by email
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Row({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
        {label}
      </div>
      {link ? (
        <a href={link} style={{ fontSize: '0.875rem', color: 'var(--brand)', textDecoration: 'none' }}>{value}</a>
      ) : (
        <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{value}</div>
      )}
    </div>
  )
}

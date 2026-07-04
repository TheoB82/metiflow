import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const payload = await req.json()
  const record = payload.record

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

  const body = `
New enquiry from ${record.name} — ${record.venue}

Email:     ${record.email}
Venues:    ${record.venues ?? '—'}
POS points: ${record.pos_points ?? '—'}
Tables:    ${record.tables ?? '—'}
Covers:    ${record.covers ?? '—'}
Message:   ${record.message ?? '—'}
Photos:    ${record.photo_urls ? record.photo_urls.join(', ') : '—'}

Submitted: ${record.created_at}
`.trim()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Metiflow Enquiries <noreply@metiflow.com>',
      to: ['admin@metiflow.com'],
      subject: `New enquiry: ${record.name} — ${record.venue}`,
      text: body,
    }),
  })

  return new Response(JSON.stringify({ ok: res.ok }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

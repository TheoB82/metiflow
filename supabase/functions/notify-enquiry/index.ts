import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ADMIN_URL = 'https://resto.metiflow.com/admin/enquiries'

serve(async (req) => {
  const payload = await req.json()
  const record = payload.record

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

  const text = `
New enquiry from ${record.name} — ${record.venue}

Email:      ${record.email}
Venues:     ${record.venues ?? '—'}
POS points: ${record.pos_points ?? '—'}
Tables:     ${record.tables ?? '—'}
Covers:     ${record.covers ?? '—'}
Message:    ${record.message ?? '—'}
Photos:     ${record.photo_urls ? record.photo_urls.join(', ') : '—'}

Submitted:  ${record.created_at}

View all enquiries → ${ADMIN_URL}
`.trim()

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#1e293b;max-width:560px;margin:0 auto;padding:24px">
  <div style="margin-bottom:24px">
    <span style="font-weight:800;font-size:18px;color:#E8651A">metiflow</span>
    <span style="color:#94a3b8;font-size:14px;margin-left:8px">Resto</span>
  </div>

  <h2 style="font-size:20px;margin:0 0 4px">New enquiry</h2>
  <p style="color:#64748b;margin:0 0 24px;font-size:14px">${record.name} · ${record.venue}</p>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
    ${row('Email', `<a href="mailto:${record.email}" style="color:#E8651A">${record.email}</a>`)}
    ${record.venues    ? row('Venues',     record.venues)            : ''}
    ${record.pos_points != null ? row('POS points', record.pos_points) : ''}
    ${record.tables    != null ? row('Tables',     record.tables)    : ''}
    ${record.covers    != null ? row('Covers',     record.covers)    : ''}
    ${record.message   ? row('Message',    record.message)           : ''}
  </table>

  <a href="${ADMIN_URL}"
     style="display:inline-block;background:#E8651A;color:#fff;text-decoration:none;
            padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px">
    View in admin →
  </a>

  <p style="color:#94a3b8;font-size:12px;margin-top:32px">
    Submitted ${new Date(record.created_at).toLocaleString('en-GB')}
  </p>
</body>
</html>
`

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
      text,
      html,
    }),
  })

  return new Response(JSON.stringify({ ok: res.ok }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

function row(label: string, value: string | number) {
  return `
    <tr>
      <td style="padding:8px 12px 8px 0;color:#64748b;white-space:nowrap;vertical-align:top;
                 border-bottom:1px solid #f1f5f9;width:120px">${label}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9">${value}</td>
    </tr>`
}

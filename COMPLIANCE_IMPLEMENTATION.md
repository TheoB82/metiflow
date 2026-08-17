# Metiflow Trader Compliance Implementation Notes

This repository currently contains static marketing and legal pages. The items below complete the backend and app-layer requirements that cannot be fully enforced in static HTML alone.

## 1) Signup Acceptance Tracking (Required)

### Frontend requirement on signup form

Require a mandatory checkbox:

- I agree to the Terms and Privacy Policy

Include links to `/terms` and `/privacy`.

### Backend storage requirement

Persist acceptance in `user_terms_acceptance` table (see `user_terms_acceptance.sql`):

- `user_id`
- `terms_version`
- `privacy_version`
- `accepted_at` (server-side timestamp)
- `ip_address`

Never rely on client-generated timestamp/IP for enforceability.

## 2) Versioned Legal Config (Required)

Use `legal-versions.json` (or a DB table/config service) as source-of-truth:

- `terms_version`
- `privacy_version`
- `cookies_version`

On registration and login, compare accepted versions with current versions.
If material changes are detected, force re-acceptance before account access.

## 3) Account Suspension & Abuse Controls (Important)

Add account lifecycle flags at account/subscription/user levels:

- `active`
- `suspended`
- `deletion_queued`
- `abuse_flagged`

Behavior requirements:

- Suspended accounts lose API and login access.
- Data remains retained for policy window.
- Admin action history should be logged.

## 4) Data Retention Workflow (Important)

Implement:

- Soft delete marker (`deleted_at`)
- Retention window (example: 90 days)
- Scheduled purge job for records beyond retention

Keep audit logs for deletion/purge actions.

## 5) Cookie Consent Enforcement (Required if analytics used)

Current static banner is implemented in `assets/cookie-consent.js` and supports:

- Accept all
- Reject non-essential
- Preferences save
- No analytics before consent

If enabling GA/Hotjar/Clarity/Meta/LinkedIn scripts, load them only inside `window.enableOptionalTracking()` after consent.

## 6) Subprocessors Governance (Important)

`/subprocessors` is published with placeholders.
Maintain this list whenever vendor scope changes:

- Supabase
- Hosting
- Email
- Analytics
- AI
- Payments

## 7) Login / Signup / App Footer Parity (Required)

This repo controls marketing pages only. Ensure the app shell and auth pages include legal footer links:

- Terms (`/terms`)
- Privacy (`/privacy`)
- Cookies (`/cookies`)
- Contact (`mailto:admin@metiflow.com`)
- Company details

## 8) Self-Service Data Export (Required before general rollout)

Referenced by Terms cl. 3 & 14, Privacy Policy §8, and DPA §3 — those documents now describe this as available; the feature needs to exist before those clauses are fully accurate.

### Scope
- **Metiflow Resto**: menus, service periods, venues/tables, order and order-item history, payment/bill records, staff list (names, not PINs), and diner contact details (name/phone) entered for takeaway or reservations.
- **Metiflow Trader**: quotes, jobs, invoices, materials, schedules, and expense records.
- Organisation-level export only — a User exports their own Account's data, not other organisations'.

### Trigger and access control
- Owner/admin role only (not general staff), from Settings.
- Available on demand, at any frequency — no artificial rate limit beyond basic abuse protection.
- Require re-authentication (password or PIN) before generating an export, given the sensitivity of diner/staff personal data included.

### Format and delivery
- Structured, machine-readable format (CSV per data type, or a single JSON/zip bundle) — supports both the "keep your own backup" purpose (Terms cl. 3/14) and data portability requests under UK GDPR Art. 20.
- Delivered as a direct in-app download; avoid emailing the export itself given it may contain personal data.

### Audit and logging
- Log every export event: which Account, which User, timestamp. This is the evidence trail referenced in the DPA's "assist with data subject rights" obligation and is the kind of record a dispute or regulator would ask for.

### Data protection notes
- Where an export includes diner personal data, the requesting Account is the controller of that data (per Terms Schedule B and the DPA) and becomes responsible for how they subsequently handle the exported copy.
- Once shipped, update Terms cl. 3/14, Privacy Policy §8, and the Resto app-store privacy policy to remove the "until that self-service tool is available" fallback language.

## 9) Enterprise Readiness (Later)

Prepare backlog items for enterprise customers:

- SLA tiers
- Audit logs UI
- Data export/delete tooling
- Access logging and permission controls
- SOC2 / ISO readiness workstreams

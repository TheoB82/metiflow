// Lightweight i18n scaffold — English only for now. Structured so EL/DE can
// be filled in later (matching the KitchenFlow app's own EN/EL/DE locales)
// without restructuring call sites: every string lives under a key in `en`,
// and `t()` always falls back to `en` for any key missing in another locale,
// so a partial translation never renders blank.
//
// Not wired to a locale switcher yet — `useLocale()` is a stub returning
// 'en'. When ready, back it with a cookie/query param and add `el`/`de`
// blocks below; every existing `t('key')` call site keeps working unchanged.

export type Locale = 'en' | 'el' | 'de'

type Dict = Record<string, string>

export const strings: { en: Dict; el: Partial<Dict>; de: Partial<Dict> } = {
  en: {
    // ── Multi-location fork (register / onboarding venue) ──────────────
    locationsQuestion: 'Just this one, or do you run more than one location?',
    locationsSingle: 'Just this one',
    locationsSingleDesc: "We'll get it set up now.",
    locationsMultiple: 'More than one',
    locationsMultipleDesc: "Set this one up first — you can add the rest from your dashboard.",

    // ── Copy-from-venue ──────────────────────────────────────────────────
    copyFromTitle: 'Start from scratch, or copy an existing venue?',
    copyFromDesc: 'Copy brings over the menu, opening hours, and feature settings — you can change any of it afterwards. Orders, staff, and devices are never copied.',
    copyFromScratch: 'Start from scratch',
    copyFromScratchDesc: 'Blank menu, default settings',
    copyFromExisting: 'Copy from',
    copyFromNone: "You don't have another venue to copy from yet.",

    // ── Handoff (after Plan) ─────────────────────────────────────────────
    handoffTitle: "You're set up — want to go further now?",
    handoffDesc: 'Everything below can just as easily be finished later, in the app, or by a metiflow admin on a call with you.',
    handoffQuick: 'Take me to the dashboard',
    handoffQuickDesc: "I'll finish the rest later",
    handoffGuided: 'Walk me through the rest',
    handoffGuidedDesc: 'Opening hours, table count, and a few feature switches — about 2 minutes',

    // ── Feature checklist ────────────────────────────────────────────────
    featuresTitle: 'A few feature switches',
    featuresDesc: "We've pre-set these from what you told us — check anything you'd like to change. All of this is editable later in Settings.",
    featureReservations: 'Reservations & bookings',
    featureReservationsDesc: 'Take table bookings and manage a booking calendar',
    featureAllergy: 'Allergy & dietary filters',
    featureAllergyDesc: 'Show GF / vegan / vegetarian filters on the order screen',
    featureSeating: 'Seat / chair selector',
    featureSeatingDesc: 'Tag items to a seat for split-bill and per-seat course pacing',
    featureStock: 'Stock & inventory tracking',
    featureStockDesc: 'Track drinks, ingredients and supplies with barcode scanning',
    featureCloudHistory: 'Keep order history in the cloud',
    featureCloudHistoryDesc: 'Access past orders from any device, not just the one that took them',

    // ── Public venue page (live) ─────────────────────────────────────────
    publicPageTitle: 'Your venue page',
    publicPageLive: 'Live',
    publicPageDesc: 'Customers see your menu here when they scan a table QR code, and can call a waiter — turn on ordering below if you also want them to add items and build a running bill.',
    enableOrdering: 'Allow online ordering',
    enableOrderingDesc: 'Customers can add items to a shared bill from the table page. Call Waiter works either way.',
  },
  el: {
    // TODO(i18n): Greek strings — see lib/i18n.ts header for the fallback contract.
  },
  de: {
    // TODO(i18n): German strings — see lib/i18n.ts header for the fallback contract.
  },
}

type Key = keyof typeof strings.en

export function useLocale(): Locale {
  // Stub — always English until a locale switcher exists.
  return 'en'
}

export function t(key: Key, locale: Locale = 'en'): string {
  return strings[locale][key] ?? strings.en[key]
}

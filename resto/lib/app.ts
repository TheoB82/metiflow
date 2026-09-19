// Where customers get the KitchenFlow / Metiflow Resto Android app.
//
// TODO: swap ANDROID_APP_URL for the public Google Play listing
// (https://play.google.com/store/apps/details?id=com.kitchenflow.kitchenflow)
// once the app is live in Production. Until then this is the Firebase App
// Distribution tester link — it only works for invited testers, so a new
// customer who isn't on the tester list can't use it yet.
export const ANDROID_APP_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ??
  'https://appdistribution.firebase.google.com/testerapps/1:1058339185986:android:30116851c30dd4f20e14db/releases/6okfh3b6m0nao'

// iOS: no build yet (no Apple Developer Program account). Set to a URL when
// there is one; null renders a "coming soon" badge.
export const IOS_APP_URL: string | null = process.env.NEXT_PUBLIC_IOS_APP_URL ?? null

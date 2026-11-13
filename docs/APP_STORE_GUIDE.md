# App Store & Google Play Publication Guide

This document outlines how to package and publish **Last Man Standing** to the **Google Play Store (Android)** and the **Apple App Store (iOS)**.

---

## 1. Architecture: Live Web Wrapper

Because **Last Man Standing** uses Next.js 16 (App Router), Supabase SSR cookies, and dynamic edge RPCs, the app is configured using **Capacitor** pointing to your production Vercel deployment:

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wazzheed.lastmanstanding',
  appName: 'Last Man Standing',
  webDir: 'public',
  server: {
    url: 'https://last-man-standing-wazzheed79.vercel.app',
    cleartext: false,
  },
};

export default config;
```

### Major Advantages of this Setup:
1. **Instant Updates:** When you push updates to GitHub `main`, Vercel auto-deploys, and your iOS & Android app users receive the changes immediately without needing to resubmit to Apple or Google!
2. **Zero Code Duplication:** You maintain one single codebase for Web, Android, and iOS.
3. **PWA Native Shell:** Users get full-screen app experience, native splash screens, and push notifications.

---

## 2. Store compliance in the app

Both Apple and Google reject apps that are missing legal pages or a way to delete an account.

1. **Account deletion** is on `/account`. The database function is in `supabase/migrations/20261113000000_delete_own_account.sql`. **It is not installed on the live database yet.** Until you run that file in the Supabase SQL editor, the button will tell the player it is not switched on. Do not drop any columns when you run it.
2. **Privacy Policy:** `/privacy` (on the live site: `https://last-man-standing-wazzheed79.vercel.app/privacy`).
3. **Terms of Use:** `/terms` (on the live site: `https://last-man-standing-wazzheed79.vercel.app/terms`). The game is free. Say that in the store listing. There is no entry fee and no prize.
4. **Notifications:** the account page can ask the browser for pick reminders.

### Still for you to do before Google Play or the App Store

The phone apps are not built yet. `capacitor.config.ts` only points a future app shell at the live website. `@capacitor/android` and `@capacitor/ios` are not installed, and there is no `android/` or `ios/` folder.

- Run the delete-account SQL above on the live Supabase project before you submit.
- Create the Google Play and Apple developer accounts yourself (Google has a one-time registration fee; Apple has a yearly developer fee).
- Add the Android and iOS projects (`npx cap add android` / `npx cap add ios`) on a machine that has Android Studio or a Mac with Xcode. This cloud copy cannot upload to the stores.
- Replace `REPLACE_WITH_YOUR_RELEASE_KEY_SHA256_FINGERPRINT` in `public/.well-known/assetlinks.json` after you create the Android release key. The package name there matches `com.wazzheed.lastmanstanding`.
- In the store forms, choose a sports / trivia game with **no real-money gambling**. Age rating is yours to answer; the app is not aimed at children under 13.
- Give Apple a demo login in the review notes.
- Take real phone screenshots for the store listing. The PWA icons (`icon-192.png`, `icon-512.png`) are already the right sizes.

---

## 3. Google Play Store (Android)

You have two options for Android:

### Option A: PWABuilder (Fastest, no local Android Studio required)
1. Go to [PWABuilder.com](https://www.pwabuilder.com/).
2. Enter your live URL: `https://last-man-standing-wazzheed79.vercel.app`.
3. PWABuilder will detect your `manifest.webmanifest`, icons, and theme colors.
4. Click **Package for Store** $\rightarrow$ **Android**.
5. Download the generated `.aab` (Android App Bundle).
6. Upload this `.aab` file directly to the Google Play Console!

### Option B: Capacitor Android
1. In your terminal, run:
   ```powershell
   npm install @capacitor/android
   npx cap add android
   npx cap sync
   ```
2. Open the project in Android Studio:
   ```powershell
   npx cap open android
   ```
3. In Android Studio, go to **Build** $\rightarrow$ **Generate Signed Bundle / APK** to produce the release `.aab`.

### Google Play Console Checklist:
- One-time \$25 registration fee.
- Complete the "Content Rating" questionnaire (choose sports/predictor, no real-money gambling).
- Complete the 14-day closed testing period with testers (required by Google for personal accounts).

---

## 4. Apple App Store (iOS)

Apple requires building through Xcode on a Mac (or using cloud CI such as GitHub Actions).

### Steps to Build for iOS:
1. Run:
   ```bash
   npm install @capacitor/ios
   npx cap add ios
   npx cap sync
   ```
2. Open in Xcode:
   ```bash
   npx cap open ios
   ```
3. In Xcode:
   - Select the target `App`.
   - Under **Signing & Capabilities**, select your Apple Developer Team.
   - Choose **Any iOS Device (arm64)** as the target.
   - Go to **Product** $\rightarrow$ **Archive** $\rightarrow$ **Distribute App** to upload to App Store Connect.

### Apple App Store Review Tips:
- **Demo Account:** In App Store Connect, provide a test login (email + password) in the Review Notes so Apple's reviewer can test signing in and making picks.
- **Classification:** Categorize as **Games / Sports / Trivia**. Specify that it is a free-to-play social companion app with no real money gambling.
- **Privacy Policy URL:** `https://last-man-standing-wazzheed79.vercel.app/privacy`
- **Terms URL (support / description):** `https://last-man-standing-wazzheed79.vercel.app/terms`

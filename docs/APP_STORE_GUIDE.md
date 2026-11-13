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

## 2. Store Compliance Features (Included)

Both Apple and Google have strict review guidelines that reject apps missing legal and account controls:

1. **In-App Account Deletion (Apple Guideline 5.1.1(v)):**
   - Implemented under `/account` (`app/account/page.tsx`).
   - Authenticated users can self-delete their account and player data.
   - Database RPC created: `supabase/migrations/20261113000000_delete_own_account.sql`.
2. **Public Privacy Policy:**
   - Live at `https://last-man-standing-wazzheed79.vercel.app/privacy`.
   - Meets GDPR and store review requirements.
3. **Push Notifications Foundation:**
   - Web & Native notification triggers built into `/account`.

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
- **Privacy Policy URL:** Enter `https://last-man-standing-wazzheed79.vercel.app/privacy`.

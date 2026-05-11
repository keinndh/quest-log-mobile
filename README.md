# Quest Log: Mobile Adventure
### *Turn your daily tasks into a pixel-art RPG adventure.*

**Quest Log** is a high-performance, mobile-first Progressive Web App (PWA) designed to gamify productivity. Built with a retro 8-bit aesthetic, it transforms mundane tasks into epic quests, rewarding players with XP and Gold to level up and unlock legendary weapons.

![Quest Log Banner](assets/img/icon-512.png)

## Key Features
- **RPG Task Management**: Create quests with varying difficulties (Easy to Legendary) and earn rewards upon completion.
- **Hero Progression**: Level up your character, track stats, and watch your Kingdom (Stronghold) grow.
- **Weapon Shop**: Spend your hard-earned gold on tiered weapons—from common swords to Divine artifacts.
- **PWA Excellence**: Fully installable on iOS and Android. Works **offline** via Service Workers.
- **Immersive Audio**: Retro sound effects for clicks, quest completions, and level-ups.
- **Data Portability**: Export and Import your save data as JSON anytime.
- **Cloud Sync**: Optional Firebase integration to keep your progress safe across devices.

## Tech Stack
- **Core**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Storage**: LocalStorage (Offline-First) + Firebase (Cloud Sync)
- **UI**: Retro Pixel-Art Design System
- **PWA**: Web Manifest + Service Worker (Network-First Strategy)
- **Audio**: Web Audio API

## How to Convert to APK (Android)
To turn this project into a downloadable APK for the Play Store or direct installation:
1. **Host the Project**: Upload these files to a public URL (e.g., GitHub Pages, Netlify, or Vercel).
2. **Use PWABuilder**:
   - Go to [PWABuilder.com](https://www.pwabuilder.com/).
   - Enter your hosted URL.
   - Click "Build My App".
   - Select **Android** and download the `.apk` or `.aab` package.
3. **Install**: Sideload the APK onto your device or upload it to the Google Play Console.

## Getting Started
1. Clone the repository.
2. Open `login.html` in any modern browser.
3. Register your account and begin your journey!

---
*Created by the Quest Log Team.*

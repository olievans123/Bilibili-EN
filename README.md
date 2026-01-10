# Bilibili EN

A native desktop app for browsing Bilibili with automatic English translations. Designed for non-Chinese speakers who want to explore China's largest video platform without the language barrier.

## Features

**Browsing**
- Trending videos with English titles
- Search in English (auto-translated to Chinese)
- Category filtering (Gaming, Music, Anime, etc.)
- Channel pages with video lists

**Video Player**
- Embedded Bilibili player
- Comments with English translations
- Related videos
- Video downloads (desktop app only)

**Personalization**
- Watch history
- Favorites
- Custom playlists
- Channel subscriptions
- Dark mode

**Account**
- QR code login with Bilibili mobile app
- Access member-only content
- Higher video quality with login

## Requirements

**Desktop App (Recommended)**
- macOS 13.0 or later
- Apple Silicon (M1/M2/M3/M4) or Intel

**Web Version**
- Any modern browser
- Some features limited (no login, no downloads)

## Installation

### macOS
1. Download the latest `.dmg` from [Releases](https://github.com/olievans123/bilibili-en/releases)
2. Open the DMG and drag to Applications
3. Right-click the app and select "Open" (first time only, to bypass Gatekeeper)

### Build from Source
```bash
# Clone the repo
git clone https://github.com/olievans123/bilibili-en.git
cd bilibili-en

# Install dependencies
npm install

# Run in development
npm run dev

# Build desktop app
npm run tauri build
```

## How It Works

- Titles, descriptions, and comments are translated via Google Translate API
- Search queries are translated from English to Chinese
- Videos play through Bilibili's official embedded player
- Login uses Bilibili's QR code authentication (desktop app only)

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri 2.0
- **Styling**: Tailwind CSS
- **Translation**: Google Translate API

## License

MIT

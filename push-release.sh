#!/bin/bash
set -e

cd /Users/olievans/Projects/BilibiliApp

# Generate icons
echo "Generating icons..."
node scripts/generate-icons.js

# Build the app
echo "Building app..."
npm run tauri build

# Update version in tauri.conf.json to 0.2.0
sed -i '' 's/"version": "0.1.0"/"version": "0.2.0"/' src-tauri/tauri.conf.json

# Git commit and push
echo "Committing changes..."
git add -A
git commit -m "v0.2.0: Fullscreen support, comments fix, new icon

Features:
- Native fullscreen mode (press F or click button)
- Fullscreen integrates with Tauri window API
- Auto-hiding player controls

Fixes:
- Comments now load properly (tries 3 different API endpoints)
- BVID-to-AID decoder for faster comment loading
- API 403 errors fixed with proper browser headers
- Removed Accept-Encoding to avoid compression issues
- Fixed duplicate 'No videos found' display

Other:
- New Bilibili-themed app icon
- Better error messages with retry buttons
- Keyboard shortcut F for fullscreen

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push

# Create GitHub release
echo "Creating release..."
DMG_FILE=$(ls src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null | head -1)

if [ -n "$DMG_FILE" ]; then
  gh release create v0.2.0 "$DMG_FILE" \
    --title "v0.2.0 - Fullscreen & Comments Fix" \
    --notes "## What's New

### Features
- **Native Fullscreen Mode** - Press \`F\` or click the fullscreen button to enter fullscreen
- Fullscreen integrates with macOS native fullscreen
- Auto-hiding player controls in fullscreen

### Bug Fixes
- **Comments now load properly** - Fixed by trying multiple API endpoints
- Added BVID-to-AID decoder for faster comment loading
- Fixed API 403 errors with proper browser headers
- Fixed duplicate 'No videos found' display

### Other
- New Bilibili-themed app icon
- Better error messages with retry buttons

## Installation
1. Download the \`.dmg\` file below
2. Open and drag to Applications
3. If blocked by Gatekeeper, run:
   \`\`\`
   xattr -cr /Applications/Bilibili\\ EN.app
   \`\`\`

## Keyboard Shortcuts
- \`F\` - Toggle fullscreen
- \`D\` - Download menu
- \`P\` - Add to playlist
- \`?\` - Show shortcuts
- \`Esc\` - Exit fullscreen / Close player"
else
  echo "No DMG found. Build may have failed."
  exit 1
fi

echo "Done! Release v0.2.0 created."

# Quick Symbols Chrome Extension

**Quick Symbols** is a fast, keyboard-first Chrome extension for finding and copying special characters instantly.

## Features
- **Instant Search**: Fuzzy matching for symbols, names, and aliases.
- **Keyboard Navigation**: Full support for arrow keys and shortcuts.
- **Favorites & History**: Stay focused with pinned and recently used symbols.
- **Privacy First**: No tracking or analytics. Symbol search runs locally.
- **Freemium Pro**: Free core symbols, with premium symbol sets unlocked by a Razorpay-backed lifetime license.
- **Premium UI**: Clean popup design with dynamic pastel hover effects.

## Pro Payments
- Checkout page: `upgrade.html`
- API routes: `api/create-order`, `api/verify-payment`, `api/check-license`, `api/recover-license`
- Required environment variables on Vercel:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `LICENSE_SECRET` (optional, falls back to `RAZORPAY_KEY_SECRET`)
- After deploying, keep `config.js` and `manifest.json` pointed at the same Vercel domain.

## How to Install
1. Clone this repository.
2. Go to `chrome://extensions/` in your browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this directory.

## Shortcut
- **Mac**: `Command + Shift + S`
- **Windows/Linux**: `Ctrl + Shift + S`

Developed by **KJR Labs** 🇮🇳

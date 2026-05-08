# MiMo Travel Buddy 🌍✈️

A travel companion app — not just a translator. Cultural tips, quick phrases, first-hour guide, allergy cards, and emergency help. All visible, all proactive, all one tap away.

## What It Does

**Dashboard-first design.** The first thing you see is your travel dashboard — not a text input box.

| Section | What It Does |
|---------|-------------|
| 🍽️ Quick Phrases | Context-aware phrase pills (restaurant, airport, hotel, shopping, transport, social) |
| 💡 Cultural Tips | Things locals want you to know — dismissable, always visible |
| 🗣️ Translate | Type anything → instant translation with copy/listen/save |
| 🎯 Practice | Smart suggestions based on what you've translated most |
| ⏱️ First Hour | 5 essential phrases for your first hour in a new country |
| 📋 Allergy Card | Medical profile — blood type, allergies, medications, emergency contact |
| 🆘 Emergency | Full-screen red overlay, speaks your medical info in the local language |

## Quick Start

```bash
cd mimoTranslate-redesign
npm install
npm start
# open http://localhost:3000
```

## Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Backend:** Node.js + Express
- **Translation:** MyMemory API (free, no key needed)
- **TTS:** Google Translate TTS

## Features (25/25)

1. Dashboard layout with travel-first sections
2. Header: flag + country + time-of-day greeting
3. Dark mode toggle
4. Settings gear with full menu
5. Emergency card (red, pulsing, one-tap)
6. Emergency overlay (full-screen, speaks medical info)
7. Context quick phrases (auto-detected)
8. Context switcher (pick: restaurant/airport/hotel/shopping/transport/social)
9. Cultural tips (per-country, dismissable)
10. Translate input with inline mic + camera
11. Translate button with gradient styling
12. Translation result with copy/listen/save
13. Practice mode (flashcard-style)
14. Smart practice prompts (based on translation frequency)
15. First hour guide (5 essential phrases per language)
16. Allergy card / medical profile
17. Dietary card (via medical profile)
18. Medical profile modal (blood, allergies, medications, contact)
19. Sticky bottom bar (First Hour · Allergy · SOS)
20. Voice input (Web Speech API)
21. Camera button (placeholder)
22. Sound system (toggle on/off)
23. History view
24. Phrasebook (saved translations)
25. Onboarding (3-step intro)

## Supported Languages

🇯🇵 Japanese · 🇰🇷 Korean · 🇨🇳 Chinese · 🇪🇸 Spanish · 🇫🇷 French · 🇩🇪 German · 🇮🇹 Italian · 🇵🇹 Portuguese · 🇷🇺 Russian · 🇸🇦 Arabic · 🇮🇳 Hindi · 🇹🇭 Thai · 🇻🇳 Vietnamese

## Project Structure

```
mimoTranslate-redesign/
├── index.html          # App shell — dashboard, overlays, modals
├── styles.css          # All styles — polished, layered, responsive
├── app.js              # All logic — dashboard, chat, translate, emergency
├── server.js           # Express backend — /translate, /speak, /health
├── package.json        # Dependencies
└── .gitignore
```

## Design Philosophy

**Travel buddy, not emergency app.** Emergency is always one tap away (SOS in bottom bar), but it doesn't dominate the screen. The dashboard is about your trip — what you need right now.

**Proactive, not reactive.** Cultural tips show before you ask. Context phrases appear based on where you are. Practice suggestions come from your behavior.

**Everything visible.** No hidden menus for core features. Emergency, allergy card, first-hour guide — all on the first screen or one tap away.

## License

MIT

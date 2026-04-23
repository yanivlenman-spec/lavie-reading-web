# Lavie Reading Web

Hebrew reading app for Lavie (child, ~7 years old). React + Vite web version with full feature parity to the mobile app.

**Live**: https://lavie-reading-web.vercel.app

## Stack

- React 19, Vite, Tailwind CSS
- Speech recognition via Web Speech API (Chrome, Edge)
- LocalStorage for persistence
- Responsive RTL design (Hebrew)

## Features

- **Reading**: Speech recognition → word matching → progress tracking
- **Parent mode** (PIN: 1979): Per-story stats, screen time deduction, reset
- **Test mode** (PIN: 1979): Snapshot/restore for iteration
- **Progression**: Unlock stories sequentially, star scoring (1–3 ⭐ based on WPM)
- **Streaks**: Track consecutive days & accumulated screen time

## Dev

```bash
npm install
npm run dev    # localhost:5173
npm run build  # production build
```

## Deploy

```bash
bash deploy.sh
```

This builds → deploys to Vercel → aliases to `https://lavie-reading-web.vercel.app`.

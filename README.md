# Copa26 Command Center

> AI-native tournament operations and fan engagement command center for the 2026 global football event.
> **Live Demo:** [https://copa26-command-center.vercel.app/](https://copa26-command-center.vercel.app/)

---

## ⚠️ Disclaimer

**This is a personal portfolio and educational project.**
It is **not affiliated with, endorsed by, or connected to FIFA, the FIFA World Cup, Concacaf, UEFA, any national football association, clubs, players, or any official tournament entity.**

All names, logos, media, and tournament data used within this project are for demonstration, portfolio showcase, and educational purposes only. Any official imagery is used strictly as placeholder material. The application does not scrape official domains or claim to provide officially licensed data.

This is an independent AI-powered fan engagement experience created by **[Aloria](https://aloria.mx)**. Aloria designs AI-native digital commerce and engagement experiences for local businesses, brands, communities, and private events.

---

## Architecture Summary

The application is built as a modern, serverless, AI-first monorepo:

- **Web App:** React 18, TypeScript, Vite, TanStack Router/Query, Zustand. Offline-first PWA architecture.
- **3D Visualization:** React Three Fiber procedural stadium (no heavy external assets).
- **Serverless APIs:** Vercel Edge Functions for AI relays, cron jobs, and health monitoring.
- **Database:** Firebase Firestore for real-time synchronization and leaderboard state.
- **AI Provider Layer:** Dual-provider (OpenAI GPT-4o-mini + Google Gemini 2.5 Flash) with fallback, streaming, and function calling.
- **Deployment:** Vercel (Production deployment is gated through GitHub Actions).
- **Automation:** Scheduled Vercel cron jobs for data synchronization and background AI tasks.

---

## Key Features

- **AI Analyst:** Conversational AI with streaming responses, voice input, PDF tactical analysis, and generative UI charts.
- **3D Stadium:** Procedural interactive pitch with dynamic weather, lighting, and transitions.
- **Prediction Pool:** Real-time synced quiniela with AI co-pilots and P2P sharing.
- **Responsible AI:** Grounded prompts, deterministic offline actions, and transparent source attribution.

---

## Local Setup

### 1. Install Dependencies
```bash
pnpm install --no-frozen-lockfile
```

### 2. Environment Variables
Copy the example file and populate your keys:
```bash
cp .env.example .env.local
```
**Required Categories in `.env.local`:**
- Firebase client config
- AI Providers (OpenAI / Gemini)
- Vercel/Cron secrets
- (No real secrets should ever be committed)

### 3. Run Development Server
```bash
pnpm --filter web dev
```

### 4. Verification Commands
```bash
pnpm typecheck
pnpm test
pnpm build
```

---

## Deployment Model

This project uses **GitHub Actions** as the primary production gate (`.github/workflows/deploy.yml`).
The workflow runs installations, typechecks, and tests before executing the Vercel CLI deployment and aliasing the production domain.

**Important:** The native Vercel Git auto-deployment should be disabled or ignored in the Vercel dashboard to prevent overlapping or untested production deployments.

## License

UNLICENSED.
This code is provided for portfolio review purposes only. It is not open-source and may not be distributed or commercialized without explicit permission.

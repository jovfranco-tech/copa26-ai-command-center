# Copa 2026 AI Command Center

> AI-native sports intelligence dashboard for the 2026 international football tournament.
> Personal engineering project — not affiliated with any sports organization.

---

## What this demonstrates

| Capability | Implementation |
|-----------|----------------|
| **AI Product Architecture** | Dual-provider (OpenAI + Gemini) with failover, streaming, function calling, memory, multi-turn conversation |
| **3D Interactive Visualization** | Procedural stadium with React Three Fiber — zero imported 3D models, all geometry generated in code |
| **Real-time Data Sync** | Firebase Firestore + Background Sync API + live overlay for instant score updates |
| **Responsible AI** | Grounded prompts, confidence scoring, anti-hallucination guardrails, transparent source attribution |
| **Sports Data Engineering** | Zod-validated pipeline, idempotent ingestion, audit logging, result verification |
| **Production Readiness** | 149 tests, WCAG AA accessibility, PWA installable, error boundaries, health endpoint |

---

## Architecture

```
React 18 / TypeScript / Vite
├── TanStack Router + Query (type-safe routing, data fetching)
├── Zustand (5 stores: pool, favorites, preferences, filters, notifications)
├── Three.js / React Three Fiber / Drei (3D stadium)
├── Firebase Firestore (real-time sync, persistent offline cache)
├── Vercel Edge Functions (AI relay, health, monitoring)
└── OpenAI GPT-4o-mini + Gemini 2.5 Flash (dual-provider AI)
```

---

## Key Features

### AI Analyst
- Conversational AI with streaming responses and provider indicator
- 6 context modes (tournament, match, team, player, tactical, press room)
- Voice input (Web Speech API) + audio recording (sent to Gemini)
- PDF upload for tactical report analysis
- Generative UI: AI produces chart JSON → Recharts renders visualizations
- Memory system with periodic summarization (60 records, 7-day compression)
- 9 offline-first deterministic actions (no API needed)

### 3D Stadium
- Fully procedural (pitch, stands, goals, floodlights, LED ribbon, jumbotrons)
- Dynamic weather (rain, snow, fog) + time-of-day (day, sunset, night)
- Animated soccer ball with pentagon texture and organic bounce physics
- Golden trophy easter egg rotating in pre-match
- Confetti particle burst on goals during live matches
- Night-mode bloom on floodlights
- Starry skybox with moon
- 5 camera presets with smooth LERP transitions

### Family Prediction Pool (Quiniela)
- Real-time Firestore sync with leaderboard
- 3 AI co-pilot tactical agents (Optimista, Estadístico, Contrarian)
- Background Sync for offline resilience
- P2P sync via 4-digit codes
- CSV export, PDF print, shareable achievement cards

---

## Key Engineering Decisions

- **Offline-first**: App works without network (bundled dataset + Firestore persistent cache + SW caching)
- **AI guardrails**: Grounded prompts, function calling for structured output, retry with exponential backoff, 30s timeout
- **Performance**: Three.js lazy-loaded (892KB only on demand), 27→2 active useFrame callbacks via early bailout, shadow map disabled on mobile
- **Accessibility**: WCAG AA contrast, ARIA tabs, focus-visible, skip-to-content, prefers-reduced-motion, prefers-contrast:more
- **Security**: CSP headers, CORS lockdown, rate limiting, file size validation, no secrets in code

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript 5.7, Vite 6, TanStack Router/Query, Zustand |
| 3D | Three.js, React Three Fiber, React Three Drei |
| AI | OpenAI GPT-4o-mini, Google Gemini 2.5 Flash, function calling |
| Backend | Vercel Edge Functions, Firebase Firestore |
| Data | Drizzle ORM, SQLite, Zod schemas, pnpm monorepo |
| Testing | Vitest (149 tests), Testing Library |
| CI/CD | GitHub → Vercel (auto-deploy on push) |

---

## Not included in this repo

- No API keys (bring your own via environment variables)
- No official tournament data beyond the public schedule
- No gambling features (family prediction pool with zero monetary value)

---

## Setup

```bash
pnpm install
cp .env.example .env.local  # Add your API keys
pnpm --filter web dev       # Start dev server
pnpm --filter web test      # Run tests (149)
pnpm --filter web build     # Production build
```

---

## Disclaimer

This is a personal/educational project. It is not affiliated with, endorsed by, or connected to FIFA, any national football association, or any official tournament entity. All tournament data used is publicly available factual information.

This is an independent AI-powered fan engagement experience created by **[Aloria](https://aloria.mx)**. A subtle Aloria attribution badge (external link) and an independent-fan-experience transparency disclaimer appear in the dashboard footer. Aloria designs AI-native digital commerce and engagement experiences for local businesses, brands, communities, and private events.

---

## License

MIT

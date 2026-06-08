# Changelog — Copa 2026 Dashboard

All notable changes to this project are documented in this file.
This is a private personal/family project. Not intended for commercial distribution.

---

## [0.6.0] — 2026-06-07

### 🧪 Browser E2E (Playwright)
- Added Playwright E2E against a local production preview (real bundle, lazy chunks): home brand + no-affiliation copy, ES⇄EN language switch, the Aloria attribution link (href/target/rel), and a lazy route navigation. 4 specs, verified green.

### 📊 Lighthouse in CI
- New `ci.yml` workflow runs the Playwright E2E and a Lighthouse audit (performance / accessibility / best-practices / SEO) over the built app. Kept separate from `deploy.yml` so it never blocks a deploy; assertions start at warn level.

### 📈 Observability — Vercel RUM
- Wired the official Vercel **Analytics** (page analytics) and **Speed Insights** (real-user Core Web Vitals) components, complementing the existing in-app Web Vitals reporter.

---

## [0.5.0] — 2026-06-07

### ⚡ Performance — lazy English dictionary
- Split the English i18n dictionary into its own chunk (~26 kB gzip) loaded on demand. Spanish (default + fallback) ships in the main bundle; the en chunk loads before the language flips (boot for a persisted 'en', and the toggle) so there's no flash. Initial `index` JS now ~132 kB gzip (was ~268 kB before this round of work — Recharts + en splits combined).

### 🛡️ Brand safety — generic event language
- Replaced generic "World Cup" / "Mundial" references in visible copy with "Copa 2026" / "the tournament" (notably the on-pitch canvas title, previously "FIFA WORLD CUP 2026", and a stray "Official Press Room"). The independence disclaimers still name FIFA / the World Cup — only to disclaim affiliation. No new affiliation language anywhere.

### 🧪 Tests & accessibility
- Added i18n unit tests (lazy-en fallback-then-swap, interpolation, missing-key, brand-safe disclaimer) and a LanguageToggle component test asserting the ARIA segmented-group semantics (role, accessible name, aria-pressed). 149 → 158 tests.
- Fixed the e2e smoke script (correct production domain + page title).
- Verified WCAG AA contrast for the touched controls (attribution badge 4.7–5.8:1, language toggle 8.3:1).

---

## [0.4.0] — 2026-06-07

### ⚡ Performance — lighter initial load
- Lazy-loaded the secondary nav routes (Standings, Bracket, Favorites). Bracket pulled the chart library (Recharts) into the eager app-shell chunk; deferring it drops the initial `index` JS from ~268 kB → ~157 kB gzip (Recharts' ~100 kB gzip now loads only on chart routes). Three.js and Firebase were already route-lazy.

### 🛡️ Type safety — api/ in CI
- Added `api/tsconfig.json` and a `typecheck:api` script; `pnpm typecheck` (and the deploy workflow) now strictly type-check the serverless functions in `api/`, closing the gap where only Vercel's build surfaced api/ type errors as non-blocking annotations.
- Fixed the cross-module result type in `api/sync-results.ts` (explicit `ResultEntry` element type so the merge type-checks under any module resolution).

### 🌐 i18n — position labels
- Localized the long position labels (`posLong`) via a new `positions` namespace: Player detail, the 3D stadium player card, and the AI analyst answers now show Goalkeeper/Defender/Midfielder/Forward in EN instead of the Spanish data string.

### 🔎 Audit
- Confirmed existing hardening on the AI endpoint: per-IP rate limiting, input length caps, upload size/MIME limits, plus client error reporting and Web Vitals monitoring.

---

## [0.3.1] — 2026-06-06

### 💅 Attribution polish
- Refined Aloria attribution, bilingual footer copy, independent project disclaimer, spacing, accessibility, and external link behavior.
- Spanish badge copy localized to "Experiencia de fans con IA por Aloria ↗" (EN: "AI Fan Experience by Aloria ↗").
- Added breathing room between the fixed badge and the settings gear (no crowding).
- Brand-safety audit: no official-affiliation language; event references stay generic/disclaimed.

---

## [0.3.0] — 2026-06-06

### ✨ Attribution & Transparency
- Added subtle Aloria attribution, external link, and independent fan experience transparency disclaimer.
- Footer badge ("AI Fan Experience by Aloria ↗" / "Experiencia fan con IA por Aloria ↗") links to https://aloria.mx (new tab, `rel="noopener noreferrer"`), fixed bottom-right on desktop, in the footer on mobile.
- Centralized the link as `ALORIA_URL` (`apps/web/src/lib/aloria.ts`); copy lives in the EN/ES i18n files (`footer.aloria*`).

### 🌐 Internationalization
- Full ES/EN localization across the dashboard, including the 3D stadium tactical layer (roles, zones, AI insights).

---

## [0.2.0] — 2026-06-03

### 🌟 Major: Estadio 3D — Real Match Schedule Integration
- **Connected Estadio 3D to the real 104-match tournament schedule** via `useMatches()` hook — previously isolated to 4 demo fixtures
- **Default match is now M001: México vs Sudáfrica** (Estadio Azteca, June 11) — the real inaugural match
- **Bridged real `Match` type** to stadium format via `bridgeRealMatch()` adapter — reads date/time to infer `timeOfDay`, maps UPCOMING/LIVE/FT statuses, looks up venue names from `useVenuesMap()`
- Added graceful offline fallback to `MATCH_FIXTURES` when API is unavailable
- Added `isPending` / `isDemo` labels to the match selector overlay for transparency

### 🎨 Team Visual Identity — All 48 WC2026 Teams
- **Expanded `teamVisualIdentity.ts`** from 8 to all 48 qualified teams
- Colors sourced from `worldcup2026.json` (colorA/colorB) — accurate national team colors
- Added `contrastColor()` WCAG luminance utility — auto-computes text contrast
- Fixed white-primary teams (GER, ENG) getting readable fallback accent colors
- All player chips in the 3D scene and 2D map now use correct team colors

### 🔧 Architecture: Decoupled Data Layer
- **Removed circular dependency**: `stadiumDataMapper.ts` no longer imports `MATCH_FIXTURES`
- `mapDatabasePlayersToLineups()` now accepts `matchStatus` + `matchMinute` as parameters — decoupled from fixture lookup
- Extracted curated analytics into `DEMO_MATCH_ANALYTICS` keyed by team-pair
- Added `getDemoAnalytics(homeCode, awayCode)` helper
- Added `PLACEHOLDER_INSIGHTS` / `PLACEHOLDER_ANALYTICS` for non-demo matches

### 🛡️ Security Hardening
- Added server-side file size validation in `api/analyst.ts` — rejects base64 payloads > ~4MB (HTTP 413)
- Added MIME type allowlist: `application/pdf`, `audio/webm`, `audio/ogg`, `audio/mp4`
- Validation happens before any data is forwarded to the Gemini API

### 💎 UX Polish — Estadio 3D Sidebar
- `AIMatchBrief` upgraded to `MatchLineups` type — no longer tied to static `MATCH_LINEUPS`
- "Datos Pendientes" badge shown in sidebar when match has no curated analytics
- "Calendario local" label shown in match selector for non-demo real matches
- Fixed color contrast for away team players (white/light kits now use accent color)
- Added loading indicator while `useMatches()` fetches real data

### 📚 Documentation
- Added `CHANGELOG.md` (this file)
- Added `SECURITY_NOTES.md` — documents defensive measures for private use
- Updated `README_PRIVATE.md` — reflects v0.2.0 changes

---

## [0.1.0] — 2026-05-31

### Initial Release
- Full tournament dashboard: schedule, standings, stats, bracket
- 104 Group Stage matches from real WC2026 calendar
- 48 teams, 16 venues, squad data for major selections
- Pool (quiniela) system with Firestore persistence and QR sync
- AI Analyst (local + Gemini API) with voice, PDF, and chart support
- Estadio 3D visualization (WebGL + Three.js) with 4 demo matches
- Team crests, flags, player photos with cascade fallback system
- Private access — family sharing enabled
- TV Mode, Match Day widget, Favorites, Data Center

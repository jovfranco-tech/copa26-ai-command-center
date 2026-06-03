# Changelog — Private World Cup 2026 Dashboard

All notable changes to this project are documented in this file.
This is a private personal/family project. Not intended for commercial distribution.

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

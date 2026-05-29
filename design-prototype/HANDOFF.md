# FIFA Private World Cup Dashboard — Implementation Handoff

**Target stack:** React 18 + Vite + TypeScript + Tailwind CSS
**Mode:** Private, **local-only** dashboard. Not for public distribution. No official affiliation. **No scraping in this phase.**

This document maps the approved HTML/JS prototype (in this project) to a production-grade local app. The prototype is the source of truth for layout, density, components, and copy.

---

## 1. Scope & guardrails

- The app runs **locally only** (e.g. `vite dev` / `vite preview` on `localhost`, or packaged with Tauri/Electron for a desktop build). Do **not** configure public deploy targets.
- All data is read from a **local cache file / local DB** (see §6). No network data sources are wired up yet. Leave a single typed `DataSource` interface so a loader can be added later — **but do not implement scraping now.**
- Keep the footer on every screen: `Private local dashboard. Not for public distribution.`
- No commercial copy, no "official" claims, no third-party logos/marks. Crests, flags and photos are **local assets with generated fallbacks** (see §5).

---

## 2. Project structure

```
src/
  main.tsx
  App.tsx                 # shell: sidebar + topbar + router outlet + mobile nav
  router.tsx              # route table (see §4)
  lib/
    types.ts              # domain types (§6)
    data.ts               # DataSource interface + LocalCacheSource impl
    standings.ts          # computeStandings(), groupTable()
    format.ts             # fmtDay, fmtFull, tabular-num helpers
    favorites.ts          # zustand store (persist -> localStorage)
    ai.ts                 # analyst prompt builder + complete() adapter
  components/
    primitives/           # Card, Badge, Pill, StatTile, Button, FormDots
    Crest.tsx  Flag.tsx  Avatar.tsx        # asset slots + fallbacks (§5)
    MatchCard.tsx  MatchRow.tsx  Ticker.tsx
    TeamCard.tsx  PlayerCard.tsx  PlayerMini.tsx
    StandingsTable.tsx  SyncCard.tsx  Section.tsx  Empty.tsx  Skeleton.tsx
    tweaks/TweaksPanel.tsx                  # appearance controls (§7)
  screens/
    Home.tsx  MatchCenter.tsx  MatchDetail.tsx
    Teams.tsx  TeamDetail.tsx  Players.tsx  PlayerDetail.tsx
    Standings.tsx  Bracket.tsx  Stats.tsx  Venues.tsx  Favorites.tsx  Analyst.tsx
  styles/
    tokens.css            # CSS variables (§3) — single source of truth
    index.css             # Tailwind layers + base
private-assets/           # user-provided local files (gitignored)
  crests/{CODE}.svg
  photos/{playerId}.jpg
  venues/{venueId}.jpg
  flags/{CODE}.svg
  data/wc2026.local.json  # the local cache (§6)
```

---

## 3. Design tokens → Tailwind

The prototype drives everything from CSS variables in `styles.css`. Port them verbatim into `tokens.css`, then expose them to Tailwind via `theme.extend` using `var(--…)` so runtime theming (Tweaks) keeps working.

**Core tokens (dark default):**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#080c14` | app background |
| `--bg-1` | `#0d1320` | sidebar / rail surfaces |
| `--bg-2` | `#131a2a` | card surface |
| `--bg-3` | `#1a2236` | hover / inset |
| `--line` | `rgba(255,255,255,.07)` | hairline borders |
| `--tx` | `#f4efe2` | warm white text |
| `--tx-2` | `#98a3ba` | secondary |
| `--tx-3` | `#5b6680` | muted / mono labels |
| `--gold` | `#c9a24b` | accent (Tweakable) |
| `--gold-amt` | `0..1` | accent intensity multiplier |
| `--live` `--pos` `--neg` `--warn` | `#ff4747` `#38d39a` `#ff6b6b` `#f0b429` | status |
| `--r` / `--r-sm` | `14px` / `9px` | radii (Tweakable) |

**Typography:** UI = grotesk (`Archivo` default; `Space Grotesk` / `Hanken Grotesk` as options). Numbers/labels = monospace (`JetBrains Mono` default; `Space Mono` / `IBM Plex Mono`). Always render scores/stats/standings with `font-variant-numeric: tabular-nums` and the mono family. `.mono-label` = 10–11px uppercase, `.14em` tracking, `--tx-3`.

**Light theme** is the same token set under `[data-theme="light"]`. **Density** is `[data-density]` switching `--gap` / `--pad` / `--row-h`.

```ts
// tailwind.config.ts (excerpt)
theme: { extend: {
  colors: { bg:'var(--bg)', surface:'var(--bg-2)', line:'var(--line)',
            tx:'var(--tx)', tx2:'var(--tx-2)', tx3:'var(--tx-3)',
            gold:'var(--gold)', live:'var(--live)', pos:'var(--pos)', neg:'var(--neg)' },
  borderRadius: { card:'var(--r)', sm:'var(--r-sm)' },
  fontFamily: { ui:'var(--font-ui)', num:'var(--font-num)' },
}}
```

---

## 4. Routing

Use `react-router-dom` with a history stack so the topbar **Back** button mirrors the prototype.

| Path | Screen | Notes |
|---|---|---|
| `/` | Home | dense 2-col: main + persistent rail |
| `/matches` | MatchCenter | filters: stage, group, team, date |
| `/matches/:id` | MatchDetail | tabs: events / lineups / statistics |
| `/bracket` | Bracket | projected R32→Final, horizontal scroll |
| `/teams` · `/teams/:code` | Teams · TeamDetail | tabs: squad / fixtures / team stats |
| `/players` · `/players/:id` | Players · PlayerDetail | sort + position filter |
| `/standings` | Standings | `?group=A` deep-link |
| `/stats` | Stats | segments: players / keepers / teams / compare |
| `/venues` | Venues | expandable fixtures |
| `/favorites` | Favorites | tabs: teams / players / matches / notes |
| `/analyst` | Analyst | context selector + citations |

Sidebar (desktop) collapses to a bottom tab bar < 960px; full nav in a drawer. Active-state mapping: detail routes highlight their parent nav item.

---

## 5. Local assets & fallbacks (`private-assets/`)

Every visual identity element is a **slot**: try the local file, otherwise render the generated fallback used in the prototype. Never ship a broken image.

```tsx
// Crest.tsx
export function Crest({ code, size = 40, slot }: CrestProps) {
  const [ok, setOk] = useState(true);
  const t = teams[code];
  if (ok) return <img src={`/private-assets/crests/${code}.svg`} onError={() => setOk(false)} … />;
  // fallback: gradient(t.colorA→colorB) rounded square + 3-letter code
  return <GeneratedCrest team={t} size={size} />;
}
```

- **Crest** → `crests/{CODE}.svg`, fallback = two-tone gradient badge + code.
- **Photo** (Avatar) → `photos/{playerId}.jpg`, fallback = team-gradient tile + initials + silhouette.
- **Flag** → `flags/{CODE}.svg`, fallback = two-tone diagonal chip.
- **Venue** → `venues/{venueId}.jpg`, fallback = stylized pitch placeholder.

The little corner "slot" badge in the prototype is a dev affordance showing an asset is local-overridable; keep it behind a `showAssetSlots` dev flag.

---

## 6. Data model (`types.ts`) & local cache

Mirror the prototype's `wc-data.js`. The local cache JSON (`private-assets/data/wc2026.local.json`) is loaded once on boot through `LocalCacheSource`.

```ts
export interface Team { id: string; name: string; code: string; group: string;
  ranking: number; confederation: string; colorA: string; colorB: string; }

export type MatchStatus = 'LIVE' | 'FT' | 'UPCOMING';
export interface Match { id: string; group: string; stage: string; matchday: number;
  home: string; away: string; homeGoals: number|null; awayGoals: number|null;
  status: MatchStatus; minute: number|null; date: string; time: string; venue: string;
  possH: number|null; shotsH: number|null; shotsA: number|null; shotsTH: number|null; shotsTA: number|null; }

export interface Player { id: string; name: string; team: string; pos: 'GK'|'DF'|'MF'|'FW';
  posLong: string; club: string; age: number; number: number;
  goals: number; assists: number; minutes: number; yellow: number; red: number; }

export interface Goalkeeper { id: string; name: string; team: string; saves: number; cleanSheets: number; }
export interface Venue { id: string; city: string; country: string; stadium: string; capacity: number; surface: string; }

export interface DataSource {            // ⚠ only LocalCacheSource for now — NO scraping
  teams(): Team[]; matches(): Match[]; players(): Player[];
  goalkeepers(): Goalkeeper[]; venues(): Venue[]; meta(): CacheMeta;
}
```

**Standings are derived, never stored** — port `computeStandings()` / `groupTable()` exactly (3pts win / 1 draw; tiebreak Pts → GD → GF). Sort zones: pos 1–2 advance, pos 3 best-third, pos 4 eliminated.

`CacheMeta` powers the local-only cues (Last sync, cache size, assets loaded, db filename). It is cosmetic/local — surface it in `SyncCard` and the topbar pill.

---

## 7. State, theming & Tweaks

- **Favorites + notes** → `zustand` store with `persist` middleware to `localStorage` (`wc_favs`, `wc_notes`). Shape: `{ teams: string[]; players: string[]; matches: string[] }`.
- **Tweaks** (appearance) → second persisted store applying to `document.documentElement`: `data-theme`, `data-density`, and inline `--gold`, `--gold-amt`, `--r`, `--font-ui`, `--font-num`. Controls: theme (dark/light), density (compact/regular/comfy), card radius, gold tone + intensity, font preset.

---

## 8. AI Match Analyst

- Keep the analyst **strictly grounded in local data**. `lib/ai.ts` builds the context string from standings + top scorers + today + recent results, plus an optional **focus context** (selected team / player / match).
- Adapter pattern: `complete(prompt): Promise<string>` wraps whichever local/allowed model the user wires up. The system prompt must enforce: *answer only from provided data; never invent; reply in the question's language; if unknown, say so.*
- UI must show: context chips, suggested prompts, **source citations** (which local tables were used), and the disclaimer **"Answers based on local cached data."**
- No internet calls from the analyst.

---

## 9. Responsive targets

- **Desktop ≥ 1180px:** sidebar + main + persistent right rail (3-column feel). Stat strip 4–5 across.
- **Tablet 960–1180px:** sidebar + single content column; rail content flows below main. 2-up cards.
- **Mobile < 960px:** bottom tab bar + drawer for full nav; stacked cards; horizontal scroll for tickers, filter pills, and wide tables; sticky search.

Tap targets ≥ 44px. Tables get `overflow-x:auto` wrappers on mobile.

---

## 10. Build order (suggested)

1. Tokens + Tailwind config + `App` shell + router + nav.
2. `DataSource` + `LocalCacheSource` + types + standings derivation.
3. Primitives + Crest/Flag/Avatar slots.
4. Home (rail, ticker, brief, watchlist) → MatchCenter/Detail → Standings → Teams/Players → Stats → Bracket → Venues → Favorites.
5. Favorites/Tweaks stores + persistence.
6. Analyst (adapter + grounded prompt + citations).
7. Polish: empty/loading states, a11y (focus rings, aria labels), keyboard nav.

**Out of scope for this phase:** any data ingestion/scraping, public deployment, auth, analytics. Leave clean seams (the `DataSource` interface) but do not implement them.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SQUADS } from '../packages/shared/src/data/squads.ts';
import { coachProfiles } from '../apps/web/src/generated/intelPacks.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const datasetFile = join(repoRoot, 'packages', 'shared', 'src', 'data', 'worldcup2026.json');
const playerPhotoDir = join(repoRoot, 'apps', 'web', 'static', 'player-photos');
const coachPhotoDir = join(repoRoot, 'apps', 'web', 'static', 'coach-photos');
const teamKitDir = join(repoRoot, 'apps', 'web', 'static', 'team-kits');
const brandDir = join(repoRoot, 'apps', 'web', 'static', 'brand');
const tmpDir = join(repoRoot, '.tmp-local-pack');

const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg']);
const dataset = JSON.parse(readFileSync(datasetFile, 'utf8'));
const teamsByCode = Object.fromEntries(dataset.teams.map((team) => [team.code, team]));

mkdirSync(playerPhotoDir, { recursive: true });
mkdirSync(coachPhotoDir, { recursive: true });
mkdirSync(teamKitDir, { recursive: true });
mkdirSync(brandDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

await updateFifaRankings();
materializeMissingPlayerPortraits();
materializeMissingCoachPortraits();
materializeMissingCoreKits();
writeBrandBallAsset();

console.log('[finalize-local-data-pack] local data pack completed.');

async function updateFifaRankings() {
  const res = await fetch('https://api.fifa.com/api/v3/rankings/?gender=1&count=250&language=en', {
    headers: {
      accept: 'application/json',
      'user-agent': 'FIFA-Private-Dashboard/0.1 (personal dashboard ranking updater)',
    },
  });
  if (!res.ok) throw new Error(`FIFA ranking fetch failed: HTTP ${res.status}`);
  const json = await res.json();
  const rankingsByCode = new Map((json.Results ?? []).map((row) => [row.IdCountry, row]));

  let updated = 0;
  for (const team of dataset.teams) {
    const ranking = rankingsByCode.get(team.code);
    if (!ranking?.Rank) continue;
    team.ranking = ranking.Rank;
    updated++;
  }

  dataset.meta.rankingSource = 'FIFA/Coca-Cola Men’s World Ranking';
  dataset.meta.rankingSourceUrl = 'https://inside.fifa.com/fifa-world-ranking/men';
  dataset.meta.rankingPublishedAt = '2026-04-01';
  dataset.meta.rankingNextUpdate = '2026-06-11';
  dataset.meta.rankingUpdatedAt = new Date().toISOString();
  writeFileSync(datasetFile, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  console.log(`[finalize-local-data-pack] rankings updated ${updated}/${dataset.teams.length}.`);
}

function materializeMissingPlayerPortraits() {
  const existing = readExistingIds(playerPhotoDir);
  let created = 0;
  for (const [teamCode, entries] of Object.entries(SQUADS)) {
    entries.forEach(([name], index) => {
      const id = `${teamCode}-${index + 1}`;
      if (existing.has(id)) return;
      writeWebpPortrait(join(playerPhotoDir, `${id}.webp`), {
        title: name,
        team: teamsByCode[teamCode],
        kind: 'player',
      });
      created++;
    });
  }
  console.log(`[finalize-local-data-pack] player portrait placeholders created ${created}.`);
}

function materializeMissingCoachPortraits() {
  const existing = readExistingIds(coachPhotoDir);
  let created = 0;
  for (const team of dataset.teams) {
    if (existing.has(team.code)) continue;
    const coach = coachProfiles.items?.[team.code];
    writeWebpPortrait(join(coachPhotoDir, `${team.code}.webp`), {
      title: coach?.name || `${team.name} coach`,
      team,
      kind: 'coach',
    });
    created++;
  }
  console.log(`[finalize-local-data-pack] coach portrait placeholders created ${created}.`);
}

function materializeMissingCoreKits() {
  const existing = readKitSlots();
  let created = 0;
  for (const team of dataset.teams) {
    for (const variant of ['home', 'away']) {
      if (existing.has(`${team.code}:${variant}`)) continue;
      const target = join(teamKitDir, `${team.code}${variant === 'home' ? '' : `-${variant}`}.svg`);
      writeKitSvg(target, team, variant);
      created++;
    }
  }
  console.log(`[finalize-local-data-pack] core kit placeholders created ${created}.`);
}

function writeBrandBallAsset() {
  const target = join(brandDir, 'fwc26-ball.svg');
  if (existsSync(target)) return;
  writeFileSync(
    target,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="World Cup ball private asset">
  <defs>
    <linearGradient id="gold" x1="96" y1="64" x2="416" y2="448" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff4c0"/>
      <stop offset=".45" stop-color="#d8a83d"/>
      <stop offset="1" stop-color="#8a6720"/>
    </linearGradient>
    <linearGradient id="ink" x1="128" y1="96" x2="384" y2="416" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="220" fill="url(#ink)"/>
  <circle cx="256" cy="256" r="196" fill="#f8fafc"/>
  <path d="M256 83 365 151 337 279H175L147 151Z" fill="url(#gold)"/>
  <path d="M147 151 75 247 135 383 175 279Z" fill="#111827"/>
  <path d="M365 151 437 247 377 383 337 279Z" fill="#111827"/>
  <path d="M175 279 135 383 256 436 377 383 337 279Z" fill="#e5e7eb"/>
  <path d="M172 154 256 104 340 154 318 253H194Z" fill="#111827" opacity=".92"/>
  <path d="M212 194h88M205 228h102M224 160h64" stroke="url(#gold)" stroke-width="16" stroke-linecap="round"/>
</svg>
`,
    'utf8',
  );
  console.log('[finalize-local-data-pack] brand ball asset created.');
}

function readExistingIds(dir) {
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((file) => imageExts.has(extname(file).slice(1).toLowerCase()))
      .map((file) => file.slice(0, -extname(file).length)),
  );
}

function readKitSlots() {
  if (!existsSync(teamKitDir)) return new Set();
  const slots = new Set();
  for (const file of readdirSync(teamKitDir)) {
    const ext = extname(file).slice(1).toLowerCase();
    if (!imageExts.has(ext)) continue;
    const id = file.slice(0, -ext.length - 1);
    const match = id.match(/^([A-Z]{3})(?:-(home|away|third|gk))?$/);
    if (!match) continue;
    slots.add(`${match[1]}:${match[2] ?? 'home'}`);
  }
  return slots;
}

function writeWebpPortrait(target, { title, team, kind }) {
  const colorA = normalizeColor(team?.colorA, '#172554');
  const colorB = normalizeColor(team?.colorB, '#d8a83d');
  const label = escapeXml(title);
  const badgeColor = kind === 'coach' ? '#111827' : '#f8fafc';
  const strokeColor = normalizeColor(team?.colorB, '#d8a83d');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360">
  <defs>
    <linearGradient id="bg" x1="42" y1="32" x2="318" y2="328" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${colorA}"/>
      <stop offset="1" stop-color="${colorB}"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="28%" r="75%">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".42"/>
      <stop offset=".45" stop-color="#ffffff" stop-opacity=".12"/>
      <stop offset="1" stop-color="#000000" stop-opacity=".26"/>
    </radialGradient>
  </defs>
  <rect width="360" height="360" rx="72" fill="url(#bg)"/>
  <rect width="360" height="360" rx="72" fill="url(#halo)"/>
  <circle cx="180" cy="128" r="62" fill="#f8fafc" opacity=".92"/>
  <path d="M72 328c14-82 58-128 108-128s94 46 108 128" fill="#f8fafc" opacity=".92"/>
  <path d="M96 286c42 26 126 26 168 0" fill="none" stroke="${strokeColor}" stroke-width="16" stroke-linecap="round" opacity=".9"/>
  <circle cx="278" cy="82" r="34" fill="${badgeColor}" opacity=".94"/>
  <path d="M262 82h32M278 66v32" stroke="${strokeColor}" stroke-width="10" stroke-linecap="round" opacity=".92"/>
  <title>${label}</title>
</svg>`;
  svgToWebp(svg, target);
}

function writeKitSvg(target, team, variant) {
  const primary = normalizeColor(variant === 'away' ? team.colorB : team.colorA, '#172554');
  const secondary = normalizeColor(variant === 'away' ? team.colorA : team.colorB, '#d8a83d');
  writeFileSync(
    target,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${escapeXml(team.name)} ${variant} kit private fallback">
  <defs>
    <linearGradient id="kit" x1="28" y1="28" x2="228" y2="232" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${secondary}"/>
    </linearGradient>
  </defs>
  <path d="M84 34h88l32 18 30 55-35 22-16-25v110H73V104l-16 25-35-22 30-55Z" fill="url(#kit)"/>
  <path d="M92 34c5 19 17 30 36 30s31-11 36-30" fill="#f8fafc" opacity=".88"/>
  <path d="M75 104h106M73 170h110" stroke="#f8fafc" stroke-width="10" opacity=".55"/>
  <text x="128" y="148" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="800" fill="#f8fafc">${team.code}</text>
</svg>
`,
    'utf8',
  );
}

function svgToWebp(svg, target) {
  const tmp = join(tmpDir, `${Date.now()}-${Math.random().toString(16).slice(2)}.svg`);
  writeFileSync(tmp, svg, 'utf8');
  const result = spawnSync('magick', [tmp, '-resize', '360x360', '-quality', '82', target], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`ImageMagick failed for ${target}`);
}

function normalizeColor(color, fallback) {
  return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color ?? '') ? color : fallback;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

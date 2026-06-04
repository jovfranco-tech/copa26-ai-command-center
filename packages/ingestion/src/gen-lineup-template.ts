/**
 * Print a ready-to-paste OFFICIAL_LINEUPS entry for a given match, pre-filled
 * from the real curated squads so you only have to swap names/shirts to match the
 * confirmed XI.
 *
 *   pnpm --filter @worldcup/ingestion gen:lineup M001 [formationHome] [formationAway]
 *
 * Formations default to 4-3-3 (edit to the real shape). The output is a typed
 * `OfficialMatchLineup` entry — paste it into
 * apps/web/src/features/stadium/data/officialLineups.ts and set status:'confirmada'
 * once you've sourced the real lineup.
 */
import { mock } from '@worldcup/shared';

const matchId = process.argv[2];
const formHome = process.argv[3] ?? '4-3-3';
const formAway = process.argv[4] ?? '4-3-3';

const match = mock.MATCHES.find((m) => m.id === matchId);
if (!matchId || !match) {
  console.error(`✗ Uso: gen:lineup <matchId> [formHome] [formAway]`);
  console.error(`  matchId no encontrado: ${matchId ?? '(vacío)'}`);
  process.exit(1);
}

/** DF = primer dígito, FW = último, MF = la suma de los del medio. */
function lineCounts(formation: string): { DF: number; MF: number; FW: number } {
  const d = formation.split('-').map((n) => parseInt(n, 10)).filter((n) => n > 0);
  if (d.length < 2 || d.reduce((a, b) => a + b, 0) !== 10) return { DF: 4, MF: 3, FW: 3 };
  return { DF: d[0]!, MF: d.slice(1, -1).reduce((a, b) => a + b, 0), FW: d[d.length - 1]! };
}

function pickStarters(code: string, formation: string) {
  const squad = mock.PLAYERS.filter((p) => p.team === code);
  const used = new Set<string>();
  const take = (pos: 'GK' | 'DF' | 'MF' | 'FW', n: number) => {
    const out: { shirt: number; name: string; pos: string; playerId: string }[] = [];
    const push = (p: (typeof squad)[number]) => {
      used.add(p.id);
      out.push({ shirt: p.number ?? 0, name: p.name, pos, playerId: p.id });
    };
    for (const p of squad) if (out.length < n && !used.has(p.id) && p.pos === pos) push(p);
    for (const p of squad) if (out.length < n && !used.has(p.id)) push(p); // backfill
    return out;
  };
  const { DF, MF, FW } = lineCounts(formation);
  return [...take('GK', 1), ...take('DF', DF), ...take('MF', MF), ...take('FW', FW)];
}

// Single quotes (repo style) unless the name contains an apostrophe.
const q = (s: string) => (s.includes("'") ? JSON.stringify(s) : `'${s}'`);
const fmtStarter = (s: { shirt: number; name: string; pos: string; playerId: string }) =>
  `        { shirt: ${s.shirt}, name: ${q(s.name)}, pos: '${s.pos}', playerId: '${s.playerId}' },`;

const teamBlock = (label: string, code: string, formation: string) =>
  [
    `    ${label}: {`,
    `      formation: '${formation}',`,
    `      manager: '',`,
    `      starters: [`,
    ...pickStarters(code, formation).map(fmtStarter),
    `      ],`,
    `    },`,
  ].join('\n');

const entry = [
  `  ${matchId}: {`,
  `    status: 'probable', // cambia a 'confirmada' con la alineación oficial real`,
  `    source: 'Plantilla generada — reemplazar con la fuente oficial',`,
  teamBlock('home', match.home, formHome),
  teamBlock('away', match.away, formAway),
  `  },`,
].join('\n');

console.log(`// ${match.home} vs ${match.away} · ${match.date}${match.time ? ' ' + match.time : ''}`);
console.log(entry);

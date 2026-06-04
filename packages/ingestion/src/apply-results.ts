/**
 * Apply a match-results feed to the tournament dataset and write it back.
 *
 *   pnpm --filter @worldcup/ingestion apply:results [resultsFile]
 *
 * `resultsFile` defaults to ./results.json (relative to the current directory).
 * Shape:  { "M001": { "homeGoals": 2, "awayGoals": 1 }, "M007": { ... } }
 *         (optional per match: "status": "LIVE"|"FT", "minute", "possH", "shotsH", "shotsA")
 *
 * Standings, group ranks and goal stats are derived from the matches, so after
 * this writes the dataset you just commit + push: CI runs the integrity tests
 * and deploys, and the table fills in automatically.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyMatchResults,
  computeStandings,
  type MatchResultInput,
  type Match,
  type Team,
} from '@worldcup/shared';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATASET = join(HERE, '..', '..', 'shared', 'src', 'data', 'worldcup2026.json');

// pnpm sets INIT_CWD to the directory the command was invoked from (repo root),
// while process.cwd() is the package dir under `--filter`. Resolve against INIT_CWD
// so a results file at the repo root is found when you run from the repo root.
const baseDir = process.env.INIT_CWD || process.cwd();
const resultsPath = resolve(baseDir, process.argv[2] ?? 'results.json');

if (!existsSync(resultsPath)) {
  console.error(`✗ No se encontró el archivo de resultados: ${resultsPath}`);
  console.error('  Formato: { "M001": { "homeGoals": 2, "awayGoals": 1 }, ... }');
  process.exit(1);
}

const results = JSON.parse(readFileSync(resultsPath, 'utf8')) as Record<string, MatchResultInput>;
const dataset = JSON.parse(readFileSync(DATASET, 'utf8')) as {
  matches: Match[];
  teams: Team[];
  [k: string]: unknown;
};

const { matches, applied, pending, skipped } = applyMatchResults(dataset.matches, results);

if (applied.length === 0) {
  console.log(
    `Nada que aplicar — ${pending.length} pendiente(s)${skipped.length ? `, ${skipped.length} con problema` : ''}. El dataset no se modificó.`,
  );
  for (const s of skipped) console.warn(`   - ${s.id}: ${s.reason}`);
  console.log('Llena homeGoals/awayGoals de los partidos jugados y vuelve a correr.');
  process.exit(0);
}

// Preserve the canonical (date, time, id) ordering the CI integrity test guards.
matches.sort(
  (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id),
);

writeFileSync(DATASET, JSON.stringify({ ...dataset, matches }, null, 2) + '\n', 'utf8');

console.log(`✓ Resultados aplicados: ${applied.length} (${applied.join(', ')})`);
if (pending.length) console.log(`· Pendientes (sin marcador aún): ${pending.length}`);
if (skipped.length) {
  console.warn(`⚠ Omitidos: ${skipped.length}`);
  for (const s of skipped) console.warn(`   - ${s.id}: ${s.reason}`);
}

const table = computeStandings(dataset.teams, matches);
const played = Object.values(table)
  .filter((r) => r.P > 0)
  .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);
if (played.length) {
  console.log('\nVista previa de la tabla (equipos con partidos jugados):');
  for (const r of played) {
    const gd = `${r.GD >= 0 ? '+' : ''}${r.GD}`;
    console.log(`   ${r.team}  PJ ${r.P}  Pts ${r.Pts}  GF ${r.GF}  GC ${r.GA}  DG ${gd}`);
  }
}

console.log(`\n✓ Dataset actualizado: ${DATASET}`);
console.log('  Commit + push → CI valida la integridad y despliega.');

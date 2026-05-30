import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirs = [
  join(repoRoot, 'apps', 'web', 'static', 'player-photos'),
  join(repoRoot, 'private-assets', 'players'),
];
const targetDir = join(repoRoot, 'apps', 'web', 'dist', 'player-photos');
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);

if (!sourceDirs.some((dir) => existsSync(dir))) {
  console.log('[copy-player-photos] no player photo source found; skipping.');
  process.exit(0);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });

let copied = 0;
const seen = new Set();
for (const sourceDir of sourceDirs) {
  if (!existsSync(sourceDir)) continue;
  for (const file of readdirSync(sourceDir)) {
    const ext = extname(file).toLowerCase();
    const id = basename(file, ext);
    if (!allowed.has(ext) || seen.has(id)) continue;
    copyFileSync(join(sourceDir, file), join(targetDir, file));
    seen.add(id);
    copied++;
  }
}

console.log(`[copy-player-photos] copied ${copied} player photos to apps/web/dist/player-photos.`);

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirs = [
  join(repoRoot, 'apps', 'web', 'static', 'brand'),
  join(repoRoot, 'private-assets', 'brand'),
];
const targetDir = join(repoRoot, 'apps', 'web', 'dist', 'brand');
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

if (!sourceDirs.some((dir) => existsSync(dir))) {
  console.log('[copy-brand-assets] no brand asset source found; skipping.');
  process.exit(0);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });

let copied = 0;
const seen = new Set();
for (const sourceDir of sourceDirs) {
  if (!existsSync(sourceDir)) continue;
  for (const file of readdirSync(sourceDir)) {
    if (!allowed.has(extname(file).toLowerCase()) || seen.has(file)) continue;
    copyFileSync(join(sourceDir, file), join(targetDir, file));
    seen.add(file);
    copied++;
  }
}

console.log(`[copy-brand-assets] copied ${copied} brand assets to apps/web/dist/brand.`);

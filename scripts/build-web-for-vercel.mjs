import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const steps = [
  ['node', ['scripts/generate-team-kits.mjs']],
  ['node', ['scripts/generate-team-crests.mjs']],
  ['node', ['scripts/generate-player-photo-fallbacks.mjs']],
  ['pnpm', ['--filter', '@worldcup/web', 'build']],
  ['node', ['scripts/copy-player-photos-to-web-dist.mjs']],
  ['node', ['scripts/copy-team-kits-to-web-dist.mjs']],
  ['node', ['scripts/copy-team-crests-to-web-dist.mjs']],
  ['node', ['scripts/copy-brand-assets-to-web-dist.mjs']],
];

for (const [command, args] of steps) {
  console.log(`[build-web-for-vercel] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

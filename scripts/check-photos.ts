import { mock } from '../packages/shared/src/index.js';

async function main() {
  const teams = [...new Set(mock.PLAYERS.map(p => p.team))].sort();
  let totalMissing = 0;
  let totalFound = 0;
  const missingByTeam: Record<string, string[]> = {};
  
  for (const team of teams) {
    const players = mock.PLAYERS.filter(p => p.team === team);
    const missing: string[] = [];
    for (const p of players) {
      const res = await fetch(`https://fudh993bs9djeozd.public.blob.vercel-storage.com/players/${p.id}.jpg`, { method: 'HEAD' });
      if (res.status !== 200) {
        missing.push(`${p.id} (${p.name})`);
        totalMissing++;
      } else {
        totalFound++;
      }
    }
    if (missing.length > 0) {
      missingByTeam[team] = missing;
    }
    process.stdout.write(`${team}: ${players.length - missing.length}/${players.length} ✓\n`);
  }
  
  console.log(`\n=== RESUMEN ===`);
  console.log(`Total con foto: ${totalFound}`);
  console.log(`Total sin foto: ${totalMissing}`);
  console.log(`Cobertura: ${((totalFound / (totalFound + totalMissing)) * 100).toFixed(1)}%`);
  
  if (Object.keys(missingByTeam).length > 0) {
    console.log(`\n=== FOTOS FALTANTES ===`);
    for (const [team, missing] of Object.entries(missingByTeam)) {
      console.log(`${team} (${missing.length}): ${missing.join(', ')}`);
    }
  }
}

main();

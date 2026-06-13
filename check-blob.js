import { getOverlay } from './api/_shared/overlay.js';

async function main() {
  const overlay = await getOverlay();
  console.log("Scraped matches:", overlay.scrapedMatches);
  console.log("Player Stats:", JSON.stringify(overlay.playerStats, null, 2));
}

main().catch(console.error);

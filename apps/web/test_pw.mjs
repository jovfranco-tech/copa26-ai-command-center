import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PW CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PW ERROR:', err.message));

  await page.goto('https://copa26-command-center.vercel.app', { waitUntil: 'networkidle' });
  await browser.close();
})();

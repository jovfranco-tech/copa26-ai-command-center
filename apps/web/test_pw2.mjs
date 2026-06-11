import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404:', response.url());
    }
  });

  await page.goto('https://copa26-command-center.vercel.app', { waitUntil: 'networkidle' });
  await browser.close();
})();

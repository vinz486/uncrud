import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const name of ['architecture', 'vote-sequence', 'security-boundaries']) {
    const svg = await readFile(`docs/assets/${name}.svg`, 'utf8');
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await page.locator('svg').screenshot({ path: `docs/assets/${name}.png` });
  }
} finally { await browser.close(); }

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// VERSION: imdb-title-cast-snapshot-v1

const startUrl =
  process.env.IMDB_START_URL || 'https://www.imdb.com/chart/top/';
const evidenceBaseName =
  process.env.EVIDENCE_BASENAME || 'imdb-title-cast-snapshot';
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 5000);

function isTitlePage(rawUrl = '') {
  try {
    return /\/title\/tt\d+\//.test(new URL(rawUrl).pathname);
  } catch (_) {
    return /\/title\/tt\d+\//.test(rawUrl);
  }
}

async function saveSnapshot(page) {
  const outDir = path.join(process.cwd(), 'output', 'imdb-title-snapshot');
  fs.mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${evidenceBaseName}-${stamp}`;

  const selectorCounts = await page.evaluate(() => {
    const selectors = [
      'a[href*="/name/nm"]',
      'a[href*="/characters/"]',
      '[data-testid*="cast"] a[href*="/name/"]',
      '[data-testid*="title-cast"] a[href*="/name/"]',
      'section a[href*="/name/"]',
      'li a[href*="/name/"]'
    ];

    return selectors.map((selector) => ({
      selector,
      count: document.querySelectorAll(selector).length
    }));
  });

  const firstNameLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/name/nm"]'))
      .slice(0, 25)
      .map((a) => ({
        text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
        href: a.getAttribute('href') || ''
      }));
  });

  fs.writeFileSync(
    path.join(outDir, `${base}.url.txt`),
    page.url(),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, `${base}.selectors.json`),
    JSON.stringify(selectorCounts, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, `${base}.name-links.json`),
    JSON.stringify(firstNameLinks, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, `${base}.html`),
    await page.content(),
    'utf8'
  );

  try {
    await page.screenshot({
      path: path.join(outDir, `${base}.png`),
      fullPage: false,
      timeout: 15000,
    });
  } catch (error) {
    fs.writeFileSync(
      path.join(outDir, `${base}.screenshot-error.txt`),
      String(error?.stack || error),
      'utf8'
    );
  }
}

Feature('IMDb title cast snapshot');

Scenario('capture title-page cast DOM snapshot for selector discovery', ({ I }) => {
  I.amOnPage(startUrl);
  I.waitForElement('body', 20);

  I.usePlaywrightTo('dismiss consent if visible', async ({ page }) => {
    const buttons = [
      page.getByRole('button', { name: /accept/i }).first(),
      page.getByRole('button', { name: /agree/i }).first(),
      page.getByRole('button', { name: /consent/i }).first(),
    ];

    for (const button of buttons) {
      try {
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          break;
        }
      } catch (_) {
        // no banner
      }
    }
  });

  I.say('Navigate until an IMDb TITLE page is open, then press ENTER once.');
  pause();

  I.usePlaywrightTo('capture title-page cast snapshot', async ({ page }) => {
    const currentUrl = page.url();

    assert.ok(
      isTitlePage(currentUrl),
      `Expected IMDb TITLE page, got ${currentUrl}`
    );

    await saveSnapshot(page);
  });

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final page visible', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

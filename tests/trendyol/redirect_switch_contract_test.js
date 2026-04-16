const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const startUrl =
  process.env.TRENDYOL_START_URL;
const evidenceBaseName =
  process.env.EVIDENCE_BASENAME || 'trendyol-redirect-switch';
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 5000);

let initialUrl = '';

function isProductUrl(url = '') {
  return /\/.*-p-\d+/i.test(url);
}

async function saveEvidence(page, phase, extra = {}) {
  const outDir = path.join(process.cwd(), 'output', 'redirect-switch');
  fs.mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${evidenceBaseName}-${phase}-${stamp}`;

  fs.writeFileSync(
    path.join(outDir, `${base}.url.txt`),
    page.url(),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, `${base}.json`),
    JSON.stringify({ phase, url: page.url(), ...extra }, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, `${base}.html`),
    await page.content(),
    'utf8'
  );

  await page.screenshot({
    path: path.join(outDir, `${base}.png`),
    fullPage: true,
  });
}

Feature('Trendyol redirect-switch contract');

Scenario('changing variant switches product context instead of blocking', ({ I }) => {
  if (!startUrl) {
    throw new Error('TRENDYOL_START_URL env var is required');
  }

  I.amOnPage(startUrl);
  I.waitForElement('body', 20);

  I.usePlaywrightTo('dismiss consent if visible', async ({ page }) => {
    const buttons = [
      page.getByRole('button', { name: /kabul|accept|allow|anladım|tamam|izin/i }).first(),
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

  I.say('Stop on the initial Trendyol PRODUCT page, then press ENTER once.');
  pause();

  I.usePlaywrightTo('capture initial product context', async ({ page }) => {
    initialUrl = page.url();

    assert.ok(
      isProductUrl(initialUrl),
      `Expected Trendyol product page, got ${initialUrl}`
    );

    await saveEvidence(page, 'initial', { initialUrl });
  });

  I.say('Now switch to another color/variant so the product context changes, then press ENTER again.');
  pause();

  I.usePlaywrightTo('verify redirect-switch behavior', async ({ page }) => {
    const finalUrl = page.url();

    assert.ok(
      isProductUrl(finalUrl),
      `Expected final state to remain a product page, got ${finalUrl}`
    );

    assert.notEqual(
      finalUrl,
      initialUrl,
      `Expected product context to change after variant switch, but URL stayed the same: ${finalUrl}`
    );

    await saveEvidence(page, 'final', {
      initialUrl,
      finalUrl,
      classification: 'redirect-switch'
    });
  });

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final page visible', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

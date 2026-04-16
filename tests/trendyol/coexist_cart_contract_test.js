const fs = require('node:fs');
const path = require('node:path');

const startUrl =
  process.env.TRENDYOL_START_URL;
const expectedUrlFragment =
  process.env.EXPECTED_URL_FRAGMENT || '/sepet';
const expectedTexts =
  process.env.EXPECTED_TEXTS_JSON
    ? JSON.parse(process.env.EXPECTED_TEXTS_JSON)
    : [];
const evidenceBaseName =
  process.env.EVIDENCE_BASENAME || 'trendyol-coexist-cart';
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 5000);

async function saveEvidence(page, phase) {
  const outDir = path.join(process.cwd(), 'output', 'coexist-cart');
  fs.mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${evidenceBaseName}-${phase}-${stamp}`;

  fs.writeFileSync(
    path.join(outDir, `${base}.url.txt`),
    page.url(),
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

Feature('Trendyol coexist-cart contract');

Scenario('different color SKUs can coexist in cart', ({ I }) => {
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

  I.say('Stop on the initial PRODUCT page, then press ENTER once.');
  pause();

  I.usePlaywrightTo('capture initial evidence', async ({ page }) => {
    await saveEvidence(page, 'initial');
  });

  I.say('Now add the chosen SKUs to cart, go to the CART page, then press ENTER again.');
  pause();

  I.usePlaywrightTo('capture final cart evidence', async ({ page }) => {
    await saveEvidence(page, 'final');
  });

  I.seeInCurrentUrl(expectedUrlFragment);

  for (const text of expectedTexts) {
    I.see(text);
  }

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final page visible', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const productUrl = process.env.PRODUCT_URL;
const expectedText = process.env.EXPECTED_TEXT || '';
const expectedUrlFragment = process.env.EXPECTED_URL_FRAGMENT || '';
const disabledSelector = process.env.DISABLED_SELECTOR || '';
const expectedDisabledCount =
  process.env.EXPECTED_DISABLED_COUNT !== undefined &&
  process.env.EXPECTED_DISABLED_COUNT !== ''
    ? Number(process.env.EXPECTED_DISABLED_COUNT)
    : null;
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 15000);
const evidenceBaseName =
  process.env.EVIDENCE_BASENAME || 'trendyol-policy-probe';

Feature('Trendyol manual real-time policy probe');

Scenario('real user can manually probe a product selection policy', ({ I }) => {
  if (!productUrl) {
    throw new Error('PRODUCT_URL env var is required');
  }

  I.say(`Opening Trendyol product page: ${productUrl}`);
  I.amOnPage(productUrl);
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

  I.say('Now act like a real user.');
  I.say('1) Select the first sofa/variant/color.');
  I.say('2) Then try the second conflicting choice.');
  I.say('3) Observe whether the second choice is blocked, disables another option, changes quantity, or replaces the first one.');

  pause();

  I.usePlaywrightTo('capture evidence after manual interaction', async ({ page }) => {
    const outDir = path.join(process.cwd(), 'output', 'policy-probe');
    fs.mkdirSync(outDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = `${evidenceBaseName}-${stamp}`;

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
      fullPage: true
    });
  });

  if (expectedUrlFragment) {
    I.seeInCurrentUrl(expectedUrlFragment);
  }

  if (expectedText) {
    I.see(expectedText);
  }

  if (disabledSelector && expectedDisabledCount !== null) {
    I.usePlaywrightTo('assert blocked/disabled element count', async ({ page }) => {
      const count = await page.locator(disabledSelector).count();

      assert.equal(
        count,
        expectedDisabledCount,
        `Expected ${expectedDisabledCount} elements for selector "${disabledSelector}", but found ${count}.`
      );
    });
  }

  if (!expectedText && !expectedUrlFragment && !(disabledSelector && expectedDisabledCount !== null)) {
    I.say('No automatic assertion was configured for this run. This execution is currently an interactive evidence capture.');
  } else {
    I.say('SUCCESS: policy signal matched the configured expectation');
  }

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final state open', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

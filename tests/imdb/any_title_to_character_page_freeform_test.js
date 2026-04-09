const assert = require('node:assert/strict');

const startUrl =
  process.env.IMDB_START_URL || 'https://www.imdb.com/chart/top/';
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 10000);

Feature('IMDb any title -> character page (freeform)');

Scenario('user can freely navigate to an IMDb character page and validate it with one ENTER', ({ I }) => {
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

  I.say('Navigate however you want until an IMDb CHARACTER page is open, then press ENTER once.');
  pause();

  I.usePlaywrightTo('verify final page is a character page', async ({ page }) => {
    const characterUrl = page.url();

    assert.match(
      characterUrl,
      /\/title\/tt\d+\/characters\/nm\d+\//,
      `Expected an IMDb character page, got ${characterUrl}`
    );

    const h1 = (await page.locator('h1').first().textContent() || '').trim();
    assert.ok(h1.length > 0, 'Expected a non-empty character-page heading');
  });

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final state visible', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

const assert = require('node:assert/strict');

const startUrl =
  process.env.IMDB_START_URL || 'https://www.imdb.com/chart/top/';
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 10000);

Feature('IMDb any title -> any cast member profile (freeform)');

Scenario('user can freely navigate to any cast member profile and validate it with one ENTER', ({ I }) => {
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

  I.say('Navigate however you want until an IMDb PERSON page is open, then press ENTER once.');
  pause();

  I.usePlaywrightTo('verify final page is a person page and came from a title/cast page', async ({ page }) => {
    const personUrl = page.url();

    assert.match(
      personUrl,
      /\/name\/nm\d+\//,
      `Expected an IMDb person page, got ${personUrl}`
    );

    const h1 = (await page.locator('h1').first().textContent() || '').trim();
    assert.ok(h1.length > 0, 'Expected a non-empty person-page heading');

    await page.goBack({ waitUntil: 'domcontentloaded' });
    const backUrl = page.url();

    assert.match(
      backUrl,
      /\/title\/tt\d+(\/fullcredits\/?)?/,
      `Expected previous page to be an IMDb title or full-credits page, got ${backUrl}`
    );
  });

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final state visible', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

const assert = require('node:assert/strict');

const startUrl =
  process.env.IMDB_START_URL || 'https://www.imdb.com/chart/top/';
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 10000);

Feature('IMDb any title -> character page');

Scenario('user can manually choose any title and open a character page when IMDb exposes one', ({ I }) => {
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

  I.say('Open ANY IMDb title page from chart/home/list, then press ENTER.');
  pause();

  I.usePlaywrightTo('assert current page is a title page', async ({ page }) => {
    assert.match(
      page.url(),
      /\/title\/tt\d+\//,
      `Expected an IMDb title page, got ${page.url()}`
    );
  });

  I.say('Now open a CHARACTER page from the cast/full credits area, then press ENTER.');
  pause();

  I.usePlaywrightTo('assert current page is a character page', async ({ page }) => {
    assert.match(
      page.url(),
      /\/title\/tt\d+\/characters\/nm\d+\//,
      `Expected an IMDb character page, got ${page.url()}`
    );

    const h1 = (await page.locator('h1').first().textContent() || '').trim();
    assert.ok(h1.length > 0, 'Expected a non-empty character-page heading');
  });

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final page open', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

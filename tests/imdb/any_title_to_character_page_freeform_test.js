const assert = require('node:assert/strict');

const startUrl =
  process.env.IMDB_START_URL || 'https://www.imdb.com/chart/top/';
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 10000);

function extractMatch(url, regex, label) {
  const match = url.match(regex);
  assert.ok(match, `Could not extract ${label} from URL: ${url}`);
  return match[1];
}

Feature('IMDb any title -> character page (state-aware freeform)');

Scenario('user can stop on a person or character page and script resolves the character page', ({ I }) => {
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

  I.say('Navigate however you want until an IMDb PERSON page or CHARACTER page is open, then press ENTER once.');
  pause();

  I.usePlaywrightTo('resolve and verify character page from current state', async ({ page }) => {
    const currentUrl = page.url();

    // Case 1: user already opened a character page
    if (/\/title\/tt\d+\/characters\/nm\d+\//.test(currentUrl)) {
      const h1 = (await page.locator('h1').first().textContent() || '').trim();
      assert.ok(h1.length > 0, 'Expected a non-empty character-page heading');
      return;
    }

    // Case 2: user stopped on a person page reached from a title/fullcredits page
    if (/\/name\/nm\d+\//.test(currentUrl)) {
      const personId = extractMatch(currentUrl, /\/name\/(nm\d+)\//, 'person id');

      let sourceUrl = null;

      for (let i = 0; i < 3; i++) {
        await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
        const backUrl = page.url();

        if (/\/title\/tt\d+(\/fullcredits\/?)?/.test(backUrl)) {
          sourceUrl = backUrl;
          break;
        }
      }

      assert.ok(
        sourceUrl,
        `Expected browser history to contain an IMDb title/fullcredits page before the person page, but got ${page.url()}`
      );

      const titleId = extractMatch(sourceUrl, /\/title\/(tt\d+)\//, 'title id');
      const characterUrl = `https://www.imdb.com/title/${titleId}/characters/${personId}/`;

      await page.goto(characterUrl, { waitUntil: 'domcontentloaded' });

      const finalUrl = page.url();
      assert.match(
        finalUrl,
        /\/title\/tt\d+\/characters\/nm\d+\//,
        `Expected an IMDb character page, got ${finalUrl}`
      );

      const h1 = (await page.locator('h1').first().textContent() || '').trim();
      assert.ok(h1.length > 0, 'Expected a non-empty character-page heading');
      return;
    }

    // Case 3: user stopped too early
    if (/\/title\/tt\d+(\/fullcredits\/?)?/.test(currentUrl)) {
      throw new Error(
        `You stopped on a title/fullcredits page (${currentUrl}). For this script, continue one step further and stop on a PERSON page or a CHARACTER page, then press ENTER.`
      );
    }

    throw new Error(
      `Unsupported IMDb state for this flow: ${currentUrl}. Stop on a PERSON page or a CHARACTER page, then press ENTER.`
    );
  });

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final page visible', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

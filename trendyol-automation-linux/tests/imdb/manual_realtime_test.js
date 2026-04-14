const assert = require('node:assert/strict');

const movieUrl =
  process.env.MOVIE_URL || 'https://www.imdb.com/title/tt0468569/';
const targetActor =
  process.env.CAST_NAME || 'Christian Bale';
const manualTimeoutMs =
  Number(process.env.MANUAL_TIMEOUT_MS || 180000);
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 0);

function normalize(text = '') {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

Feature('IMDb manual real-time validation');

Scenario('real user can manually reach the actor profile', ({ I }) => {
  I.say(`Opening movie page and waiting for the real user to reach ${targetActor}`);
  I.amOnPage(movieUrl);
  I.waitForElement('body', 20);
  I.seeInCurrentUrl('/title/');

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

  I.say(`You now have ${manualTimeoutMs / 1000} seconds to navigate manually to ${targetActor} in the visible browser window.`);

  I.usePlaywrightTo('wait for manual navigation to the actor profile', async ({ page }) => {
    await page.waitForURL(/\/name\/nm\d+\//, { timeout: manualTimeoutMs });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15000 });

    const openedName = normalize(
      await page.locator('h1').first().textContent()
    );

    assert.equal(
      openedName,
      normalize(targetActor),
      `Expected "${normalize(targetActor)}" but opened "${openedName}".`
    );
  });

  I.say(`SUCCESS: real user reached ${targetActor} profile`);

  if (postSuccessWaitMs > 0) {
    I.say(`Keeping the final page open for ${postSuccessWaitMs / 1000} seconds`);
    I.usePlaywrightTo('keep page open after success', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

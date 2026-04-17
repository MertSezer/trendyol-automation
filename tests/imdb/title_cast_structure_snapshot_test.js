const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// VERSION: imdb-title-cast-structure-v1

const startUrl =
  process.env.IMDB_START_URL || 'https://www.imdb.com/title/tt0050083/';
const evidenceBaseName =
  process.env.EVIDENCE_BASENAME || 'imdb-title-cast-structure';
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 3000);

function isTitlePage(rawUrl = '') {
  try {
    return /\/title\/tt\d+\//.test(new URL(rawUrl).pathname);
  } catch (_) {
    return /\/title\/tt\d+\//.test(rawUrl);
  }
}

async function saveStructure(page, payload) {
  const outDir = path.join(process.cwd(), 'output', 'imdb-title-structure');
  fs.mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${evidenceBaseName}-${stamp}`;

  fs.writeFileSync(
    path.join(outDir, `${base}.json`),
    JSON.stringify(payload, null, 2),
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

Feature('IMDb title cast structure snapshot');

Scenario('capture title-cast container structure for parser design', ({ I }) => {
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

  I.say('Stay on an IMDb TITLE page and press ENTER once.');
  pause();

  I.usePlaywrightTo('capture cast structure', async ({ page }) => {
    const currentUrl = page.url();

    assert.ok(
      isTitlePage(currentUrl),
      `Expected IMDb title page, got ${currentUrl}`
    );

    const payload = await page.evaluate(() => {
      const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();

      const titleCastContainers = Array.from(document.querySelectorAll('[data-testid*="title-cast"]'))
        .slice(0, 40)
        .map((el) => ({
          tag: el.tagName,
          dataTestid: el.getAttribute('data-testid') || '',
          text: clean(el.textContent).slice(0, 300),
          nameLinkCount: el.querySelectorAll('a[href*="/name/"]').length,
          charLinkCount: el.querySelectorAll('a[href*="/characters/"]').length
        }));

      const actorSamples = Array.from(document.querySelectorAll('a[href*="/name/"][href*="tt_cst_t_"]'))
        .slice(0, 12)
        .map((a) => {
          const container = a.closest('li, div, article, section');
          return {
            actorText: clean(a.textContent),
            actorHref: a.getAttribute('href') || '',
            containerTag: container ? container.tagName : '',
            containerText: container ? clean(container.textContent).slice(0, 500) : '',
            containerHtml: container ? container.outerHTML.slice(0, 4000) : ''
          };
        });

      const characterSamples = Array.from(document.querySelectorAll('a[href*="/characters/"]'))
        .slice(0, 12)
        .map((a) => {
          const container = a.closest('li, div, article, section');
          return {
            characterText: clean(a.textContent),
            characterHref: a.getAttribute('href') || '',
            containerTag: container ? container.tagName : '',
            containerText: container ? clean(container.textContent).slice(0, 500) : '',
            containerHtml: container ? container.outerHTML.slice(0, 4000) : ''
          };
        });

      return {
        url: location.href,
        titleCastContainers,
        actorSamples,
        characterSamples
      };
    });

    await saveStructure(page, payload);

    console.log('titleCastContainers:', payload.titleCastContainers.slice(0, 10));
    console.log('actorSamples:', payload.actorSamples.slice(0, 3));
    console.log('characterSamples:', payload.characterSamples.slice(0, 3));
  });

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final page visible', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

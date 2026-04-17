const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// VERSION: imdb-title-cast-parser-v3-card-based

const startUrl =
  process.env.IMDB_START_URL || 'https://www.imdb.com/title/tt0050083/';
const evidenceBaseName =
  process.env.EVIDENCE_BASENAME || 'imdb-title-cast-parser';
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 3000);

function clean(text = '') {
  return text.replace(/\s+/g, ' ').trim();
}

function isTitlePage(rawUrl = '') {
  try {
    return /\/title\/tt\d+\//.test(new URL(rawUrl).pathname);
  } catch (_) {
    return /\/title\/tt\d+\//.test(rawUrl);
  }
}

async function saveEvidence(page, payload) {
  const outDir = path.join(process.cwd(), 'output', 'imdb-title-parser');
  fs.mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${evidenceBaseName}-${stamp}`;

  fs.writeFileSync(
    path.join(outDir, `${base}.url.txt`),
    page.url(),
    'utf8'
  );

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

Feature('IMDb title cast parser');

Scenario('extract actor to character mapping from title page', ({ I }) => {
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

  I.usePlaywrightTo('extract title-page cast mapping', async ({ page }) => {
    const currentUrl = page.url();

    assert.ok(
      isTitlePage(currentUrl),
      `Expected IMDb title page, got ${currentUrl}`
    );

    const payload = await page.evaluate(() => {
      const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();

      const cards = Array.from(document.querySelectorAll('[data-testid="title-cast-item"]'));
      const seen = new Set();

      const rows = cards.map((card, idx) => {
        const actor =
          card.querySelector('[data-testid="title-cast-item__actor"]') ||
          card.querySelector('a[href*="/name/"][href*="tt_cst_t_"]') ||
          card.querySelector('a[href*="/name/"]');

        const characterLink =
          card.querySelector('[data-testid="cast-item-characters-link"]') ||
          card.querySelector('a[href*="/characters/"]');

        const characterList =
          card.querySelector('[data-testid="cast-item-characters-list"]');

        const actorName = actor ? clean(actor.textContent) : '';
        const characterName = characterLink
          ? clean(characterLink.textContent)
          : (characterList ? clean(characterList.textContent) : '');

        return {
          idx,
          actorName,
          characterName,
          actorHref: actor ? (actor.getAttribute('href') || '') : '',
          characterHref: characterLink ? (characterLink.getAttribute('href') || '') : '',
          cardText: clean(card.textContent)
        };
      });

      const mappings = rows
        .filter((row) => row.actorName && row.characterName)
        .filter((row) => {
          const key = `${row.actorName}||${row.characterName}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(({ idx, cardText, ...rest }) => rest);

      return {
        url: location.href,
        counts: {
          titleCastItems: cards.length,
          mappings: mappings.length
        },
        rows: rows.slice(0, 20),
        mappings
      };
    });

    await saveEvidence(page, payload);

    assert.ok(
      payload.counts.titleCastItems > 0,
      'No title-cast-item cards found on title page'
    );

    assert.ok(
      payload.mappings.length > 0,
      'No actor-character mappings found on title page'
    );

    console.log('Sample mappings:');
    console.log(JSON.stringify(payload.mappings.slice(0, 10), null, 2));
  });

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final page visible', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

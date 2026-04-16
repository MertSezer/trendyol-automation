const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const startUrl =
  process.env.IMDB_START_URL || 'https://www.imdb.com/chart/top/';
const evidenceBaseName =
  process.env.EVIDENCE_BASENAME || 'imdb-same-page-mapping';
const maxPairs =
  Number(process.env.IMDB_MAX_PAIRS || 20);
const postSuccessWaitMs =
  Number(process.env.POST_SUCCESS_WAIT_MS || 5000);

function clean(text = '') {
  return text.replace(/\s+/g, ' ').trim();
}

function getPathname(rawUrl = '') {
  try {
    return new URL(rawUrl).pathname;
  } catch (_) {
    return rawUrl;
  }
}

function extractTitleId(rawUrl = '') {
  const pathname = getPathname(rawUrl);
  const match = pathname.match(/\/title\/(tt\d+)\//);
  assert.ok(match, `Could not extract title id from URL: ${rawUrl}`);
  return match[1];
}

function isTitlePage(rawUrl = '') {
  const pathname = getPathname(rawUrl);
  return /\/title\/tt\d+\/?$/.test(pathname)
    || (/\/title\/tt\d+\//.test(pathname)
        && !/\/fullcredits\/?/.test(pathname)
        && !/\/characters\//.test(pathname));
}

function isFullCreditsPage(rawUrl = '') {
  const pathname = getPathname(rawUrl);
  return /\/title\/tt\d+\/fullcredits\/?/.test(pathname);
}

function isPersonPage(rawUrl = '') {
  const pathname = getPathname(rawUrl);
  return /\/name\/nm\d+\//.test(pathname);
}

async function saveEvidence(page, mappings) {
  const outDir = path.join(process.cwd(), 'output', 'imdb-mapping');
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
    JSON.stringify({ url: page.url(), mappings }, null, 2),
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

Feature('IMDb same-page cast to character mapping');

Scenario('capture visible actor-character pairs without leaving the page', ({ I }) => {
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

  I.say('Navigate until an IMDb TITLE page, FULL CREDITS page, or PERSON page is open, then press ENTER once.');
  pause();

  I.usePlaywrightTo('collect visible actor-character mappings', async ({ page }) => {
    let currentUrl = page.url();

    // If user stopped on a person page by mistake, recover using history
    if (isPersonPage(currentUrl)) {
      let sourceUrl = null;

      for (let i = 0; i < 5; i++) {
        await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
        const backUrl = page.url();

        if (isTitlePage(backUrl) || isFullCreditsPage(backUrl)) {
          sourceUrl = backUrl;
          break;
        }
      }

      assert.ok(
        sourceUrl,
        `Expected browser history to contain an IMDb title/fullcredits page before the person page, but got ${page.url()}`
      );

      currentUrl = sourceUrl;
    }

    // If user stopped on a title page, normalize and jump to fullcredits safely
    if (isTitlePage(currentUrl) && !isFullCreditsPage(currentUrl)) {
      const titleId = extractTitleId(currentUrl);
      const fullCreditsUrl = `https://www.imdb.com/title/${titleId}/fullcredits/`;

      await page.goto(fullCreditsUrl, { waitUntil: 'domcontentloaded' });
      currentUrl = page.url();
    }

    assert.ok(
      isFullCreditsPage(currentUrl),
      `Expected IMDb fullcredits page, got ${currentUrl}`
    );

    await page.locator('body').first().waitFor({ state: 'visible', timeout: 10000 });

    const rawRows = await page.locator('table.cast_list tr, main tr, main li').evaluateAll((rows) => {
      return rows.map((row) => {
        const actorAnchor = row.querySelector('a[href*="/name/"]');
        const actorName = actorAnchor && actorAnchor.textContent
          ? actorAnchor.textContent.replace(/\s+/g, ' ').trim()
          : '';

        const rowText = row.textContent
          ? row.textContent.replace(/\s+/g, ' ').trim()
          : '';

        return { actorName, rowText };
      });
    });

    const mappings = [];
    const seen = new Set();

    for (const item of rawRows) {
      const actorName = clean(item.actorName || '');
      const rowText = clean(item.rowText || '');

      if (!actorName || !rowText) continue;

      const characterText = clean(rowText.replace(actorName, ''));

      if (!characterText || characterText.length < 2) continue;

      const key = `${actorName}||${characterText}`;
      if (seen.has(key)) continue;
      seen.add(key);

      mappings.push({ actorName, characterText });

      if (mappings.length >= maxPairs) break;
    }

    assert.ok(
      mappings.length > 0,
      'Expected at least one visible actor-character mapping on the page'
    );

    await saveEvidence(page, mappings);

    console.log('First mappings sample:\n' + JSON.stringify(mappings.slice(0, 10), null, 2));
  });

  if (postSuccessWaitMs > 0) {
    I.usePlaywrightTo('keep final page visible', async ({ page }) => {
      await page.waitForTimeout(postSuccessWaitMs);
    });
  }
});

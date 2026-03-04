'use strict';

const fs = require('fs');
const path = require('path');
const { container } = require('codeceptjs');

Feature('Trendyol - Multi URL Enterprise Demo');

function readProductUrls() {
  const p = path.join(process.cwd(), 'products.txt');
  const raw = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  return raw
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !s.startsWith('#'))
    .filter(s => s.startsWith('http://') || s.startsWith('https://'));
}

function getCaseReport() {
  try { return container.helpers('CaseReport'); } catch (e) { return null; }
}

async function tryClickAny(I, selectors) {
  for (const sel of selectors) {
    try {
      const n = await I.grabNumberOfElements(sel);
      if (n > 0) {
        await I.click(sel);
        await I.wait(0.5);
        return sel;
      }
    } catch (e) {}
  }
  return null;
}

// Fallback: find clickable element by visible text and click via JS
async function tryClickByText(I, texts) {
  try {
    const clicked = await I.executeScript(function(texts) {
      const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const targets = (texts || []).map(norm);

      const nodes = Array.from(document.querySelectorAll('button, a, div[role=\"button\"], span[role=\"button\"]'));
      for (const el of nodes) {
        const txt = norm(el.innerText || el.textContent);
        if (!txt) continue;

        if (!targets.some(t => t && txt.includes(t))) continue;

        // skip disabled
        if (el.disabled) continue;
        const ariaDisabled = (el.getAttribute && el.getAttribute('aria-disabled')) || '';
        if (String(ariaDisabled).toLowerCase() === 'true') continue;

        try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
        try { el.click(); return txt; } catch (_) {}
      }
      return null;
    }, texts);

    if (clicked) {
      await I.wait(0.8);
      return 'text:' + String(clicked);
    }
  } catch (e) {}
  return null;
}

Scenario('Products list -> open -> add-to-cart (best effort) -> cart -> remove -> summary', async ({ I }) => {
  const urls = readProductUrls();
  if (!urls.length) {
    I.say('No URLs found in products.txt');
    return;
  }

  const caseReport = getCaseReport();
  I.say('CaseReport=' + (caseReport ? 'OK' : 'NULL'));

  let opened = 0, added = 0, skip = 0, warn = 0;

  I.say('URL count=' + urls.length);
  if (caseReport) caseReport.add('multi:start', { count: urls.length });

  for (let idx = 0; idx < urls.length; idx++) {
    const url = urls[idx];
    const n = String(idx + 1).padStart(2, '0');

    I.say('OPEN [' + (idx + 1) + '/' + urls.length + '] ' + url);
    if (caseReport) caseReport.add('url:start', { idx: idx + 1, url });

    I.amOnPage(url);
    I.wait(2);

    if (typeof I.dismissPopups === 'function') await I.dismissPopups();

    const current = await I.grabCurrentUrl();
    const title = await I.grabTitle();
    opened++;

    I.say('CURRENT=' + current);
    I.say('TITLE=' + title);

    I.saveScreenshot(n + '_product.png');

    // 1) CSS-first add to cart
    let addBtn = await tryClickAny(I, [
      'button[data-testid="add-to-basket-button"]',
      'button[class*="add-to-basket"]',
      'button[class*="add-to-cart"]',
      'button[class*="addBasket"]',
      'button[class*="basket"]',
      'button[class*="AddToBasket"]',
      'button[class*="addToBasket"]'
    ]);

    // 2) Text fallback
    if (!addBtn) {
      addBtn = await tryClickByText(I, ['sepete ekle', 'add to cart', 'add to basket']);
    }

    if (!addBtn) {
      I.say('SKIP add-to-cart (button not found)');
      skip++;
      if (caseReport) caseReport.add('url:skip', { idx: idx + 1, url, reason: 'add-to-cart not found', title });
      continue;
    }

    added++;
    I.say('Clicked add-to-cart via: ' + addBtn);
    I.wait(2);
    I.saveScreenshot(n + '_after_add.png');

    // Go to cart (best effort)
    const cartNav = await tryClickAny(I, [
      'a[href*="/sepet"]',
      'a[href*="sepet"]'
    ]);

    if (!cartNav) I.amOnPage('https://www.trendyol.com/sepet');
    I.wait(2);
    I.saveScreenshot(n + '_cart.png');

    // Remove (best effort)
    let removed = await tryClickAny(I, [
  'button[data-testid*="remove"]',
  'button[data-testid*="delete"]',
  'button[class*="remove"]',
  'button[class*="delete"]',
  'i[class*="trash"]',
  'i[class*="delete"]',
  'svg[class*="trash"]',
  'svg[class*="delete"]'
]);

if (!removed) {
  // try text-based remove
  const byTextRemove = await tryClickByText(I, ['sil', 'kaldır', 'çıkar', 'remove', 'delete']);
  if (byTextRemove) removed = byTextRemove;
}if (!removed) {
      I.say('WARN: could not find remove button');
      warn++;
      if (caseReport) caseReport.add('url:warn', { idx: idx + 1, url, reason: 'remove not found' });
    } else {
      I.say('Removed via: ' + removed);
      I.wait(2);
      I.saveScreenshot(n + '_after_remove.png');
    }

    if (caseReport) caseReport.add('url:ok', { idx: idx + 1, url, current, title, addBtn, cartNav, removed });
  }

  if (caseReport) caseReport.add('multi:done', { ok: true, counters: { opened, added, skip, warn } });
});


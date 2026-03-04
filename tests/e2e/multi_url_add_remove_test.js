'use strict';

const fs = require('fs');
const path = require('path');
const { container } = require('codeceptjs');

const ProductPage = require('../pages/ProductPage');
const CartPage = require('../pages/CartPage');

Feature('Trendyol - Multi URL Enterprise Demo (POM)');

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
  try { return container.helpers('CaseReport'); } catch (_) { return null; }
}

Scenario('Products list -> open -> add-to-cart -> cart -> remove -> summary (POM)', async ({ I }) => {
  const urls = readProductUrls();
  if (!urls.length) {
    I.say('No URLs found in products.txt');
    return;
  }

  const caseReport = getCaseReport();
  I.say('CaseReport=' + (caseReport ? 'OK' : 'NULL'));

  const product = new ProductPage(I);
  const cart = new CartPage(I);

  let opened = 0, added = 0, skip = 0, warn = 0;

  I.say('URL count=' + urls.length);
  if (caseReport) caseReport.add('multi:start', { count: urls.length });

  for (let idx = 0; idx < urls.length; idx++) {
    const url = urls[idx];
    const n = String(idx + 1).padStart(2, '0');

    I.say('OPEN [' + (idx + 1) + '/' + urls.length + '] ' + url);
    if (caseReport) caseReport.add('url:start', { idx: idx + 1, url });

    const info = await product.open(url);
    const currentUrl = info.currentUrl;
    const title = info.title;

    opened++;
    I.say('CURRENT=' + currentUrl);
    I.say('TITLE=' + title);

    I.saveScreenshot(n + '_product.png');

    const addVia = await product.addToCartBestEffort();
    if (!addVia) {
      I.say('SKIP add-to-cart (button not found)');
      skip++;
      if (caseReport) caseReport.add('url:skip', { idx: idx + 1, url, reason: 'add-to-cart not found', title });
      continue;
    }

    added++;
    I.say('Clicked add-to-cart via: ' + addVia);
    I.wait(2);
    I.saveScreenshot(n + '_after_add.png');

    const cartNav = await cart.openBestEffortFromHeader();
    I.saveScreenshot(n + '_cart.png');

    const removedVia = await cart.removeItemBestEffort();
    if (!removedVia) {
      I.say('WARN: could not find remove action');
      warn++;
      if (caseReport) caseReport.add('url:warn', { idx: idx + 1, url, reason: 'remove not found' });
    } else {
      I.say('Removed via: ' + removedVia);
      I.wait(2);
      I.saveScreenshot(n + '_after_remove.png');
    }

    if (caseReport) caseReport.add('url:ok', { idx: idx + 1, url, currentUrl, title, addVia, cartNav, removedVia });
  }

  if (caseReport) caseReport.add('multi:done', { ok: true, counters: { opened, added, skip, warn } });
});

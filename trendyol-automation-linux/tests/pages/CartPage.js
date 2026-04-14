'use strict';

const BasePage = require('./BasePage');

class CartPage extends BasePage {
  async open() {
    const { I } = this;
    I.amOnPage('https://www.trendyol.com/sepet');
    I.wait(2);
    await this.dismissPopupsBestEffort();
  }

  async openBestEffortFromHeader() {
    const { I } = this;
    const nav = await this.safeClickAny([
      'a[href*="/sepet"]',
      'a[href*="sepet"]'
    ], 0.5);

    if (!nav) {
      await this.open();
      return 'direct:/sepet';
    }

    I.wait(2);
    return nav;
  }

  async removeItemBestEffort() {
    // 1) CSS-first
    let removed = await this.safeClickAny([
      'button[data-testid*="remove"]',
      'button[data-testid*="delete"]',
      'button[class*="remove"]',
      'button[class*="delete"]',
      'i[class*="trash"]',
      'i[class*="delete"]',
      'svg[class*="trash"]',
      'svg[class*="delete"]'
    ], 0.5);

    // 2) Text fallback
    if (!removed) {
      removed = await this.safeClickByText(['sil', 'kaldır', 'çıkar', 'remove', 'delete'], 0.8);
    }

    return removed;
  }
}

module.exports = CartPage;

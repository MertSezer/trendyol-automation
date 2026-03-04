"use strict";

const { BasePage } = require("./BasePage");

class CartPage extends BasePage {
  async open() {
    // best deterministic
    await this.I.amOnPage("https://www.trendyol.com/sepet");
    await this.I.wait(2);
  }

  async goToCartBestEffort() {
    const r = await this.engine.safeClick({
      label: "go-to-cart",
      selectors: ['a[href*="/sepet"]', 'a[href*="sepet"]'],
      byText: ["sepet"],
      postWaitSec: 0.5
    });

    if (!r.ok) {
      await this.open();
      return { ok: true, via: "direct:/sepet" };
    }
    return r;
  }

  async removeBestEffort() {
    const selectors = [
      'button[data-testid*="remove"]',
      'button[data-testid*="delete"]',
      'button[class*="remove"]',
      'button[class*="delete"]',
      'i[class*="trash"]',
      'i[class*="delete"]',
      'svg[class*="trash"]',
      'svg[class*="delete"]',
    ];

    const r = await this.engine.safeClick({
      label: "remove",
      selectors,
      byText: ["sil", "kaldır", "çıkar", "remove", "delete"],
      postWaitSec: 0.8
    });

    return r; // {ok, via}
  }
}

module.exports = { CartPage };
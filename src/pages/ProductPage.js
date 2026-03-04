"use strict";

const { BasePage } = require("./BasePage");

class ProductPage extends BasePage {
  async open(url) {
    await this.I.amOnPage(url);
    await this.I.wait(2);
    await this.engine.dismissOverlays();
  }

  async readMeta() {
    const current = await this.I.grabCurrentUrl();
    const title = await this.I.grabTitle();
    return { current, title };
  }

  async addToCartBestEffort() {
    const selectors = [
      'button[data-testid="add-to-basket-button"]',
      'button[class*="add-to-basket"]',
      'button[class*="add-to-cart"]',
      'button[class*="addBasket"]',
      'button[class*="basket"]',
      'button[class*="AddToBasket"]',
      'button[class*="addToBasket"]',
    ];

    const r = await this.engine.safeClick({
      label: "add-to-cart",
      selectors,
      byText: ["sepete ekle", "add to cart", "add to basket"],
      postWaitSec: 0.5
    });

    return r; // {ok, via}
  }
}

module.exports = { ProductPage };
'use strict';

const BasePage = require('./BasePage');

class ProductPage extends BasePage {
  async open(url) {
    const { I } = this;
    I.amOnPage(url);
    I.wait(2);
    await this.dismissPopupsBestEffort();
    return {
      currentUrl: await I.grabCurrentUrl(),
      title: await I.grabTitle(),
    };
  }

  async addToCartBestEffort() {
    // 1) CSS-first
    let clicked = await this.safeClickAny([
      'button[data-testid="add-to-basket-button"]',
      'button[class*="add-to-basket"]',
      'button[class*="add-to-cart"]',
      'button[class*="addBasket"]',
      'button[class*="basket"]',
      'button[class*="AddToBasket"]',
      'button[class*="addToBasket"]'
    ], 0.5);

    // 2) Text fallback
    if (!clicked) {
      clicked = await this.safeClickByText(['sepete ekle', 'add to cart', 'add to basket'], 0.8);
    }

    return clicked; // null => not found
  }
}

module.exports = ProductPage;

const fs = require('fs');
const path = require('path');
const { I } = inject();
const ProductPage = require('./ProductPage');

class CartPage {
  async open() {
    await ProductPage.dismissBlockingOverlays();

    const candidates = [
      locate('button').withText('Sepetim'),
      locate('button').withText('Sepete Git'),
      locate('button').withText('Go to Cart'),
      locate('a').withText('Sepetim'),
      locate('a').withText('Sepete Git'),
      locate('a').withText('Cart'),
      'a[href*="sepet"]',
      'a[href*="cart"]'
    ];

    for (const candidate of candidates) {
      try {
        const count = await I.grabNumberOfVisibleElements(candidate);
        if (count > 0) {
          const clicked = await ProductPage.robustClick(candidate);
          if (clicked) {
            I.wait(2);
            return true;
          }
        }
      } catch (e) {}
    }

    I.amOnPage('/sepet');
    I.wait(2);
    return true;
  }

  async dumpState(label = 'cart_state') {
    const outputDir = path.resolve('./output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const bodyText = await I.grabTextFrom('body');
    fs.writeFileSync(path.join(outputDir, `${label}.txt`), bodyText, 'utf8');

    const currentUrl = await I.grabCurrentUrl();
    fs.writeFileSync(path.join(outputDir, `${label}.url.txt`), currentUrl, 'utf8');
  }

  async assertLoaded() {
    await this.dumpState('cart_page_loaded');
    I.see('Sepetim');
  }

  async removeAnyItem() {
    await ProductPage.dismissBlockingOverlays();
    await this.dumpState('before_remove_any');

    const candidates = [
      '[data-testid*="remove"]',
      '[class*="remove"]',
      '[class*="delete"]',
      locate('button').withText('Sil'),
      locate('button').withText('Kaldır'),
      locate('button').withText('Remove'),
      locate('button').withText('Ürünü Sil'),
      locate('a').withText('Sil'),
      locate('a').withText('Kaldır'),
      locate('a').withText('Remove')
    ];

    for (const candidate of candidates) {
      try {
        const count = await I.grabNumberOfVisibleElements(candidate);
        if (count > 0) {
          const clicked = await ProductPage.robustClick(candidate);
          if (clicked) {
            I.wait(2);
            return true;
          }
        }
      } catch (e) {}
    }

    throw new Error('REMOVE_BUTTON_NOT_FOUND');
  }

  async assertRemovalFeedback(productNamePart) {
    await this.dumpState('after_remove_feedback');
    I.see('sepetinden kaldırıldı');

    if (productNamePart) {
      I.see(productNamePart);
    }
  }
}

module.exports = new CartPage();

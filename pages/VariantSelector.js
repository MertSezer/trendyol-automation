const { I } = inject();
const ProductPage = require('./ProductPage');

class VariantSelector {
  constructor() {
    this.colorSelectors = [
      '[data-testid*="variant"]',
      '[class*="variant"]',
      '[class*="color"]',
      '[aria-label*="renk"]',
      'button',
      'div',
      'span'
    ];
  }

  async selectColor(colorName) {
    await ProductPage.dismissBlockingOverlays();

    for (const selector of this.colorSelectors) {
      try {
        const el = locate(selector).withText(colorName);
        const count = await I.grabNumberOfVisibleElements(el);

        if (count > 0) {
          const clicked = await ProductPage.robustClick(el);
          if (clicked) {
            I.wait(1);
            return true;
          }
        }
      } catch (e) {}
    }

    throw new Error(`COLOR_VARIANT_NOT_FOUND=${colorName}`);
  }

  async verifySelected(colorName) {
    await ProductPage.dismissBlockingOverlays();
    I.wait(1);
    I.see(colorName);
  }
}

module.exports = new VariantSelector();

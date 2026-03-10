const { I } = inject();

class ProductPage {
  open(url) {
    I.amOnPage(url);
  }

  async dismissBlockingOverlays() {
    const selectors = [
      '[data-testid="overlay"]',
      '.onboarding-tour__overlay',
      '.onboarding-tour',
      '[class*="overlay"]',
      '[class*="social-proof"]',
      '.social-proof-item-focused-text',
      '.social-proof-item',
      '[class*="tooltip"]',
      '[class*="popover"]',
      '[class*="modal"]',
      '[class*="backdrop"]',
      '[class*="drawer"]',
      '[class*="dropdown"]',
      '[class*="dropdown-item"]',
      '[class*="floating"]'
    ];

    for (const selector of selectors) {
      try {
        const count = await I.grabNumberOfVisibleElements(selector);
        if (count > 0) {
          I.executeScript((sel) => {
            document.querySelectorAll(sel).forEach((el) => el.remove());
          }, selector);
          I.wait(1);
        }
      } catch (e) {}
    }

    const closeCandidates = [
      'button[aria-label="Kapat"]',
      'button[title="Kapat"]',
      '.onboarding-tour__close',
      '[data-testid*="close"]'
    ];

    for (const candidate of closeCandidates) {
      try {
        const count = await I.grabNumberOfVisibleElements(candidate);
        if (count > 0) {
          I.click(candidate);
          I.wait(1);
        }
      } catch (e) {}
    }
  }

  async robustClick(locatorOrSelector) {
    await this.dismissBlockingOverlays();

    try { I.scrollTo(locatorOrSelector); } catch (e) {}
    I.wait(1);

    try {
      I.click(locatorOrSelector);
      I.wait(1);
      return true;
    } catch (e) {}

    try {
      I.forceClick(locatorOrSelector);
      I.wait(1);
      return true;
    } catch (e) {}

    try {
      const clicked = await I.executeScript((target) => {
        let el = null;

        if (typeof target === 'string') {
          el = document.querySelector(target);
        } else if (target && target.xpath) {
          el = document
            .evaluate(target.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
            .singleNodeValue;
        }

        if (!el) return false;

        el.scrollIntoView({ block: 'center', inline: 'center' });

        const blockers = [
          '[data-testid="overlay"]',
          '.onboarding-tour__overlay',
          '.onboarding-tour',
          '[class*="overlay"]',
          '[class*="social-proof"]',
          '.social-proof-item-focused-text',
          '.social-proof-item',
          '[class*="tooltip"]',
          '[class*="popover"]',
          '[class*="modal"]',
          '[class*="backdrop"]',
          '[class*="drawer"]',
          '[class*="dropdown"]',
          '[class*="dropdown-item"]',
          '[class*="floating"]'
        ];

        blockers.forEach((sel) => {
          document.querySelectorAll(sel).forEach((node) => node.remove());
        });

        el.click();
        return true;
      }, locatorOrSelector);

      if (clicked) {
        I.wait(1);
        return true;
      }
    } catch (e) {}

    return false;
  }

  async addToCart() {
    await this.dismissBlockingOverlays();

    const directClicked = await this.robustClick('[data-testid="add-to-cart-button"]');
    if (directClicked) {
      I.wait(2);
      return true;
    }

    const candidates = [
      '[data-testid*="add-to-cart"]',
      '[data-testid*="add-to-basket"]',
      locate('button').withText('Sepete Ekle'),
      locate('button').withText('Add to Cart'),
      'button[type="button"]'
    ];

    for (const candidate of candidates) {
      try {
        const count = await I.grabNumberOfVisibleElements(candidate);
        if (count > 0) {
          const clicked = await this.robustClick(candidate);
          if (clicked) {
            I.wait(2);
            return true;
          }
        }
      } catch (e) {}
    }

    throw new Error('ADD_TO_CART_BUTTON_NOT_FOUND');
  }
}

module.exports = new ProductPage();

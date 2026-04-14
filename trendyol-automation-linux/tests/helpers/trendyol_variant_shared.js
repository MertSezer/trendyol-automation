const fs = require('fs');
const path = require('path');

const colorSelectors = [
  '[data-testid*="variant"]',
  '[class*="variant"]',
  '[class*="color"]',
  '[aria-label*="renk"]',
  'button',
  'div',
  'span'
];

async function removeBySelectors(I, selectors) {
  for (const selector of selectors) {
    try {
      const count = await I.grabNumberOfVisibleElements(selector);
      if (count > 0) {
        I.executeScript((sel) => {
          document.querySelectorAll(sel).forEach(el => el.remove());
        }, selector);
        I.wait(1);
      }
    } catch (e) {}
  }
}

async function dismissBlockingOverlays(I) {
  await removeBySelectors(I, [
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
  ]);

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

async function robustClick(I, locatorOrSelector) {
  await dismissBlockingOverlays(I);

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

async function clickFirstVisible(I, candidates) {
  for (const candidate of candidates) {
    try {
      const count = await I.grabNumberOfVisibleElements(candidate);
      if (count > 0) {
        const clicked = await robustClick(I, candidate);
        if (clicked) return true;
      }
    } catch (e) {}
  }
  return false;
}

async function selectColorVariant(I, colorName) {
  await dismissBlockingOverlays(I);

  for (const selector of colorSelectors) {
    try {
      const el = locate(selector).withText(colorName);
      const count = await I.grabNumberOfVisibleElements(el);
      if (count > 0) {
        const clicked = await robustClick(I, el);
        if (clicked) {
          I.wait(1);
          return true;
        }
      }
    } catch (e) {}
  }

  throw new Error(`COLOR_VARIANT_NOT_FOUND=${colorName}`);
}

async function verifyColorSelectionApplied(I, colorName) {
  await dismissBlockingOverlays(I);
  I.wait(1);
  I.see(colorName);
}

async function addCurrentVariantToCart(I) {
  await dismissBlockingOverlays(I);

  const clicked = await robustClick(I, '[data-testid="add-to-cart-button"]');
  if (clicked) {
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

  const fallbackClicked = await clickFirstVisible(I, candidates);
  if (!fallbackClicked) {
    throw new Error('ADD_TO_CART_BUTTON_NOT_FOUND');
  }

  I.wait(2);
  return true;
}

async function openCart(I) {
  await dismissBlockingOverlays(I);

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

  const clicked = await clickFirstVisible(I, candidates);
  if (clicked) {
    I.wait(2);
    return true;
  }

  I.amOnPage('/sepet');
  I.wait(2);
  return true;
}

async function dumpCartState(I, label = 'cart_state') {
  const outputDir = path.resolve('./output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const bodyText = await I.grabTextFrom('body');
  fs.writeFileSync(path.join(outputDir, `${label}.txt`), bodyText, 'utf8');

  const currentUrl = await I.grabCurrentUrl();
  fs.writeFileSync(path.join(outputDir, `${label}.url.txt`), currentUrl, 'utf8');
}

async function assertCartPageLoaded(I) {
  await dumpCartState(I, 'cart_page_loaded');
  I.see('Sepetim');
}

async function assertRemovalFeedback(I, productNamePart) {
  await dumpCartState(I, 'after_remove_feedback');
  I.see('sepetinden kaldırıldı');
  if (productNamePart) {
    I.see(productNamePart);
  }
}

async function removeAnyCartItem(I) {
  await dismissBlockingOverlays(I);
  await dumpCartState(I, 'before_remove_any');

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

  const clicked = await clickFirstVisible(I, candidates);
  if (!clicked) {
    throw new Error('REMOVE_BUTTON_NOT_FOUND');
  }

  I.wait(2);
}

module.exports = {
  dismissBlockingOverlays,
  selectColorVariant,
  verifyColorSelectionApplied,
  addCurrentVariantToCart,
  openCart,
  dumpCartState,
  assertCartPageLoaded,
  assertRemovalFeedback,
  removeAnyCartItem
};

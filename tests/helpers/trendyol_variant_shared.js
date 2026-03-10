const colorSelectors = [
  '[data-testid*="variant"]',
  '[class*="variant"]',
  '[class*="color"]',
  '[aria-label*="renk"]',
  'button',
  'div',
  'span'
];

async function selectColorVariant(I, colorName) {
  for (const selector of colorSelectors) {
    try {
      const el = locate(selector).withText(colorName);
      const count = await I.grabNumberOfVisibleElements(el);
      if (count > 0) {
        I.click(el);
        I.wait(1);
        return true;
      }
    } catch (e) {}
  }

  throw new Error(`COLOR_VARIANT_NOT_FOUND=${colorName}`);
}

async function verifyColorSelectionApplied(I, colorName) {
  I.wait(1);
  I.see(colorName);
}

async function addCurrentVariantToCart(I) {
  const addBtn = locate('button').withText(/Sepete Ekle|Add to Cart/i);
  I.waitForVisible(addBtn, 10);
  I.click(addBtn);
  I.wait(2);
}

async function openCart(I) {
  const candidates = [
    locate('button').withText(/Sepetim|Sepete Git|Go to Cart/i),
    locate('a').withText(/Sepetim|Sepete Git|Cart/i),
    'a[href*="sepet"]',
    'a[href*="cart"]'
  ];

  for (const candidate of candidates) {
    try {
      const count = await I.grabNumberOfVisibleElements(candidate);
      if (count > 0) {
        I.click(candidate);
        I.wait(2);
        return true;
      }
    } catch (e) {}
  }

  throw new Error('CART_ENTRY_NOT_FOUND');
}

async function assertCartContainsColor(I, colorName) {
  I.see(colorName);
}

async function assertCartDoesNotContainColor(I, colorName) {
  I.dontSee(colorName);
}

async function removeCartItemByColor(I, colorName) {
  const removeCandidates = [
    locate('button').withText(/Sil|Kaldır|Remove/i),
    locate('a').withText(/Sil|Kaldır|Remove/i)
  ];

  I.see(colorName);

  for (const candidate of removeCandidates) {
    try {
      const count = await I.grabNumberOfVisibleElements(candidate);
      if (count > 0) {
        I.click(candidate);
        I.wait(2);
        return true;
      }
    } catch (e) {}
  }

  throw new Error(`REMOVE_BUTTON_NOT_FOUND_FOR_COLOR=${colorName}`);
}

module.exports = {
  selectColorVariant,
  verifyColorSelectionApplied,
  addCurrentVariantToCart,
  openCart,
  assertCartContainsColor,
  assertCartDoesNotContainColor,
  removeCartItemByColor
};

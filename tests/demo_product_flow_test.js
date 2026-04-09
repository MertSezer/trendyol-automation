Feature('Trendyol Demo Flow');

Scenario('Color -> cart -> remove with evidence', async ({ I, ProductPage, Evidence }) => {
  Evidence.resetLog();

  await ProductPage.openDemoProduct();
  await I.wait(3);
  await Evidence.step(I, '01_product_page', 'Product page opened');

  const colors = await ProductPage.getAvailableColors();
  Evidence.log(`DETECTED_COLORS: ${JSON.stringify(colors)}`);
  await Evidence.step(I, '02_colors_detected', `Detected ${colors.length} colors`);

  if (!colors || colors.length === 0) {
    throw new Error('No colors detected.');
  }

  const selected = colors[0];
  Evidence.log(`SELECTED_COLOR: ${JSON.stringify(selected)}`);

  await ProductPage.selectColor(selected);
  await I.wait(2);
  await Evidence.step(I, '03_color_selected', `Selected color: ${selected.name || selected}`);

  await ProductPage.addToCart();
  await I.wait(3);
  await Evidence.step(I, '04_added_to_cart', 'Item added to cart');

  await ProductPage.goToCart();
  await I.wait(3);
  await Evidence.step(I, '05_cart_opened', 'Cart opened');

  await ProductPage.removeFromCart();
  await I.wait(2);
  await Evidence.step(I, '06_item_removed', 'Item removed from cart');
});

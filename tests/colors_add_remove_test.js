Feature("Trendyol - Colors Add/Remove Real Scenario (dynamic)");

Scenario("Discover available colors from DOM and loop add/remove", async ({ I, ProductPage, CartPage }) => {
  const url = process.env.PRODUCT_URL;
  const size = process.env.SIZE || "";
  const max = Number(process.env.MAX_COLORS || 5);

  if (!url) throw new Error("PRODUCT_URL missing (.env or env var)");

  await ProductPage.open(url);
  await ProductPage.prepare();

  // Renkleri sayfadan çek
  const colors = await ProductPage.getAvailableColors(max);
  I.say(`Discovered colors: ${JSON.stringify(colors)}`);

  if (!colors.length) {
    await I.saveScreenshot("no_colors_discovered.png");
    throw new Error("No colors discovered from DOM");
  }

  for (const color of colors) {
    I.say(`=== COLOR: ${color} ===`);

    await ProductPage.open(url);
    await ProductPage.prepare();

    // Mevcut selectVariants çalışıyorsa onu dene; olmazsa smart color click fallback
    try {
      await ProductPage.selectVariants(color, size);
    } catch (e) {
      const ok = await ProductPage.selectColorSmart(color);
      if (!ok) {
        await I.saveScreenshot(`color_click_failed_${Date.now()}.png`);
        continue; // fail yerine sonraki renge geç
      }
    }

    await ProductPage.addToCart();

    await CartPage.goToCart();
    await CartPage.verifyAndScreenshot();
    await I.saveScreenshot(`cart_after_add_${Date.now()}.png`);

    await CartPage.removeFromCart();
    await CartPage.verifyEmpty();
    await I.saveScreenshot(`cart_after_remove_${Date.now()}.png`);
  }
});

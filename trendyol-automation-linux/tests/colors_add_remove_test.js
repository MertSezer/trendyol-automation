const fs = require("fs");
const path = require("path");

Feature("Trendyol - Colors Add/Remove Real Scenario (dynamic)");

function writeStepNote(name, lines) {
  const filePath = path.join("output", `${name}.txt`);
  const content = Array.isArray(lines) ? lines.join("\n") : String(lines);
  fs.writeFileSync(filePath, content, "utf8");
}

Scenario("Discover available colors from DOM and loop add/remove", async ({ I, ProductPage, CartPage }) => {
  const url = process.env.PRODUCT_URL;
  const size = process.env.SIZE || "";
  const max = Number(process.env.MAX_COLORS || 5);

  if (!url) throw new Error("PRODUCT_URL missing (.env or env var)");

  await ProductPage.open(url);
  await I.saveScreenshot("01_product_opened.png");
  writeStepNote("01_product_opened", [
    "step: product_opened",
    `url: ${url}`,
    `time: ${new Date().toISOString()}`
  ]);

  await ProductPage.prepare();
  await I.saveScreenshot("02_prepared.png");
  writeStepNote("02_prepared", [
    "step: prepared",
    "note: overlays/popups cleaned",
    `time: ${new Date().toISOString()}`
  ]);

  const colors = await ProductPage.getAvailableColors(max);
  await I.saveScreenshot("03_colors_discovered.png");
  writeStepNote("03_colors_discovered", [
    "step: colors_discovered",
    `colors: ${JSON.stringify(colors)}`,
    `time: ${new Date().toISOString()}`
  ]);

  if (!colors.length) {
    await I.saveScreenshot("03_no_colors_discovered.png");
    writeStepNote("03_no_colors_discovered", [
      "step: no_colors_discovered",
      `time: ${new Date().toISOString()}`
    ]);
    throw new Error("No colors discovered from DOM");
  }

  const color = colors[0];
  const colorName = typeof color === "string" ? color : color.name;

  await ProductPage.open(url);
  await ProductPage.prepare();

  try {
    await ProductPage.selectVariants(colorName, size);
  } catch (e) {
    const ok = await ProductPage.selectColorSmart(colorName);
    if (!ok) {
      await I.saveScreenshot("04_color_selected_failed.png");
      writeStepNote("04_color_selected_failed", [
        "step: color_selected_failed",
        `color: ${colorName}`,
        `time: ${new Date().toISOString()}`
      ]);
      throw e;
    }
  }

  await I.saveScreenshot("04_color_selected.png");
  writeStepNote("04_color_selected", [
    "step: color_selected",
    `color: ${colorName}`,
    `size: ${size || "-"}`,
    `time: ${new Date().toISOString()}`
  ]);

  await ProductPage.addToCart();
  await I.saveScreenshot("05_added_to_cart.png");
  writeStepNote("05_added_to_cart", [
    "step: added_to_cart",
    `color: ${colorName}`,
    `time: ${new Date().toISOString()}`
  ]);

  await CartPage.goToCart();
  await CartPage.verifyAndScreenshot();
  await I.saveScreenshot("06_cart_verified.png");
  const cartUrl = await I.grabCurrentUrl();
  writeStepNote("06_cart_verified", [
    "step: cart_verified",
    `color: ${colorName}`,
    `cart_url: ${cartUrl}`,
    `time: ${new Date().toISOString()}`
  ]);

  await CartPage.removeFromCart();
  await CartPage.verifyEmpty();
  await I.saveScreenshot("07_cart_emptied.png");
  writeStepNote("07_cart_emptied", [
    "step: cart_emptied",
    `color: ${colorName}`,
    `time: ${new Date().toISOString()}`
  ]);
});

const fs = require("fs");
const path = require("path");

Feature("Trendyol - Single Product Multi Color Scenario");

function writeStepNote(name, lines) {
  const filePath = path.join("output", `${name}.txt`);
  const content = Array.isArray(lines) ? lines.join("\n") : String(lines);
  fs.writeFileSync(filePath, content, "utf8");
}

function pad(stepNo) {
  return String(stepNo).padStart(2, "0");
}

Scenario("Discover multiple colors on same product, add each color, verify, then clean cart", async ({ I, ProductPage, CartPage }) => {
  const url = process.env.PRODUCT_URL;
  const size = process.env.SIZE || "";
  const maxColors = Number(process.env.MAX_COLORS || 3);
  const minColors = Number(process.env.MIN_COLORS || 2);

  if (!url) {
    throw new Error("PRODUCT_URL missing (.env or env var)");
  }

  let stepNo = 1;

  await ProductPage.open(url);
  await I.saveScreenshot(`${pad(stepNo)}_product_opened.png`);
  writeStepNote(`${pad(stepNo)}_product_opened`, [
    "step: product_opened",
    `product_url: ${url}`,
    `time: ${new Date().toISOString()}`
  ]);
  stepNo++;

  await ProductPage.prepare();
  await I.saveScreenshot(`${pad(stepNo)}_prepared.png`);
  writeStepNote(`${pad(stepNo)}_prepared`, [
    "step: prepared",
    "note: overlays/popups cleaned",
    `time: ${new Date().toISOString()}`
  ]);
  stepNo++;

  const discoveredColors = await ProductPage.getAvailableColors(maxColors);
  const colors = discoveredColors
    .map((x) => (typeof x === "string" ? x : x?.name))
    .filter(Boolean);

  await I.saveScreenshot(`${pad(stepNo)}_colors_discovered.png`);
  writeStepNote(`${pad(stepNo)}_colors_discovered`, [
    "step: colors_discovered",
    `product_url: ${url}`,
    `colors_found: ${JSON.stringify(discoveredColors)}`,
    `usable_colors: ${JSON.stringify(colors)}`,
    `min_required_colors: ${minColors}`,
    `time: ${new Date().toISOString()}`
  ]);

  if (colors.length < minColors) {
    await I.saveScreenshot(`${pad(stepNo)}_not_enough_colors.png`);
    writeStepNote(`${pad(stepNo)}_not_enough_colors`, [
      "step: not_enough_colors",
      `product_url: ${url}`,
      `usable_color_count: ${colors.length}`,
      `min_required_colors: ${minColors}`,
      `time: ${new Date().toISOString()}`
    ]);
    throw new Error(`Not enough colors discovered. Found ${colors.length}, required at least ${minColors}.`);
  }
  stepNo++;

  const selectedColors = colors.slice(0, maxColors);
  const addedColors = [];

  for (let idx = 0; idx < selectedColors.length; idx++) {
    const colorName = selectedColors[idx];

    await ProductPage.open(url);
    await ProductPage.prepare();

    try {
      await ProductPage.selectVariants(colorName, size);
    } catch (err) {
      const ok = await ProductPage.selectColorSmart(colorName);
      if (!ok) {
        await I.saveScreenshot(`${pad(stepNo)}_color_${idx + 1}_selection_failed.png`);
        writeStepNote(`${pad(stepNo)}_color_${idx + 1}_selection_failed`, [
          "step: color_selection_failed",
          `product_url: ${url}`,
          `selected_color: ${colorName}`,
          `time: ${new Date().toISOString()}`
        ]);
        throw err;
      }
    }

    await I.saveScreenshot(`${pad(stepNo)}_color_${idx + 1}_selected.png`);
    writeStepNote(`${pad(stepNo)}_color_${idx + 1}_selected`, [
      "step: color_selected",
      `product_url: ${url}`,
      `selected_color: ${colorName}`,
      `selected_index: ${idx + 1}`,
      `size: ${size || "-"}`,
      `time: ${new Date().toISOString()}`
    ]);
    stepNo++;

    await ProductPage.addToCart();
    addedColors.push(colorName);

    await I.saveScreenshot(`${pad(stepNo)}_color_${idx + 1}_added_to_cart.png`);
    writeStepNote(`${pad(stepNo)}_color_${idx + 1}_added_to_cart`, [
      "step: color_added_to_cart",
      `product_url: ${url}`,
      `selected_color: ${colorName}`,
      `added_colors_so_far: ${JSON.stringify(addedColors)}`,
      `time: ${new Date().toISOString()}`
    ]);
    stepNo++;

    await CartPage.goToCart();

    let cartUrl = "-";
    try {
      cartUrl = await I.grabCurrentUrl();
    } catch (_) {}

    let bodyText = "";
    try {
      bodyText = await I.grabTextFrom("body");
    } catch (_) {}

    await I.saveScreenshot(`${pad(stepNo)}_color_${idx + 1}_cart_verified.png`);
    writeStepNote(`${pad(stepNo)}_color_${idx + 1}_cart_verified`, [
      "step: cart_verified",
      `product_url: ${url}`,
      `selected_color: ${colorName}`,
      `cart_url: ${cartUrl}`,
      `body_contains_color: ${bodyText.toLowerCase().includes(String(colorName).toLowerCase())}`,
      `body_excerpt: ${bodyText.replace(/\s+/g, " ").slice(0, 500)}`,
      `time: ${new Date().toISOString()}`
    ]);
    stepNo++;
  }

  for (let idx = 0; idx < addedColors.length; idx++) {
    const removingColor = addedColors[idx];

    await CartPage.goToCart();

    if (typeof CartPage.removeFirstItem === "function") {
      await CartPage.removeFirstItem();
    } else {
      await CartPage.removeFromCart();
    }

    await I.saveScreenshot(`${pad(stepNo)}_remove_${idx + 1}.png`);
    writeStepNote(`${pad(stepNo)}_remove_${idx + 1}`, [
      "step: remove_from_cart",
      `removed_index: ${idx + 1}`,
      `removed_color_expected: ${removingColor}`,
      `time: ${new Date().toISOString()}`
    ]);
    stepNo++;
  }

  await CartPage.goToCart();

  if (typeof CartPage.verifyEmpty === "function") {
    await CartPage.verifyEmpty();
  }

  let finalCartUrl = "-";
  try {
    finalCartUrl = await I.grabCurrentUrl();
  } catch (_) {}

  await I.saveScreenshot(`${pad(stepNo)}_cart_empty.png`);
  writeStepNote(`${pad(stepNo)}_cart_empty`, [
    "step: cart_empty",
    `product_url: ${url}`,
    `removed_colors: ${JSON.stringify(addedColors)}`,
    `cart_url: ${finalCartUrl}`,
    `time: ${new Date().toISOString()}`
  ]);
});

const fs = require("fs");
const path = require("path");

Feature("Trendyol - Multi Product FIFO Cart Scenario");

function writeStepNote(name, lines) {
  const filePath = path.join("output", `${name}.txt`);
  const content = Array.isArray(lines) ? lines.join("\n") : String(lines);
  fs.writeFileSync(filePath, content, "utf8");
}

function loadProducts() {
  const p = path.join(process.cwd(), "products.json");
  if (!fs.existsSync(p)) {
    throw new Error("products.json not found");
  }

  const raw = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
  const data = JSON.parse(raw);

  if (!Array.isArray(data) || data.length < 4) {
    throw new Error("products.json must contain at least 4 products");
  }

  return data.filter(x => x && x.url && !String(x.url).startsWith("BURAYA_"));
}

Scenario("Add multiple real products and remove oldest when cart limit exceeded", async ({ I, ProductPage, CartPage }) => {
  const products = loadProducts();
  const cartLimit = Number(process.env.CART_LIMIT || 3);

  if (products.length < 4) {
    throw new Error("At least 4 real product URLs are required in products.json");
  }

  const expectedQueue = [];
  let stepNo = 1;

  for (const product of products) {
    const name = product.name || product.url;
    const url = product.url;

    I.say(`OPEN PRODUCT: ${name}`);
    await ProductPage.open(url);
    await ProductPage.prepare();
    await I.saveScreenshot(`${String(stepNo).padStart(2, "0")}_product_opened.png`);

    writeStepNote(`${String(stepNo).padStart(2, "0")}_product_opened`, [
      `step: product_opened`,
      `product: ${name}`,
      `url: ${url}`,
      `time: ${new Date().toISOString()}`
    ]);

    await ProductPage.addToCart();
    await I.saveScreenshot(`${String(stepNo).padStart(2, "0")}_added_to_cart.png`);

    writeStepNote(`${String(stepNo).padStart(2, "0")}_added_to_cart`, [
      `step: added_to_cart`,
      `product: ${name}`,
      `url: ${url}`,
      `time: ${new Date().toISOString()}`
    ]);

    expectedQueue.push(name);

    await CartPage.goToCart();
    await I.saveScreenshot(`${String(stepNo).padStart(2, "0")}_cart_after_add.png`);

    let removedOldest = null;

    if (expectedQueue.length > cartLimit) {
      removedOldest = expectedQueue.shift();

      I.say(`REMOVE OLDEST: ${removedOldest}`);
      await CartPage.removeFirstItem();
      await I.saveScreenshot(`${String(stepNo).padStart(2, "0")}_oldest_removed.png`);

      writeStepNote(`${String(stepNo).padStart(2, "0")}_oldest_removed`, [
        `step: oldest_removed`,
        `removed_product: ${removedOldest}`,
        `time: ${new Date().toISOString()}`
      ]);
    }

    const currentTitles = await CartPage.getCartProductTitles();
    writeStepNote(`${String(stepNo).padStart(2, "0")}_cart_state`, [
      `step: cart_state`,
      `last_added_product: ${name}`,
      `removed_oldest: ${removedOldest || "-"}`,
      `expected_queue: ${JSON.stringify(expectedQueue)}`,
      `cart_titles: ${JSON.stringify(currentTitles)}`,
      `time: ${new Date().toISOString()}`
    ]);

    stepNo++;
  }
});

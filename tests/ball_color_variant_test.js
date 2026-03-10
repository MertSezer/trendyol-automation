const rawDataset = require("../datasets/trendyol_ball_variant_urls.json");

const dataset = Array.isArray(rawDataset) ? rawDataset : [rawDataset];

const {
  selectColorVariant,
  verifyColorSelectionApplied,
  addCurrentVariantToCart,
  openCart,
  assertCartContainsColor,
  assertCartDoesNotContainColor,
  removeCartItemByColor
} = require("./helpers/trendyol_variant_shared");

Feature("Trendyol Ball Color Variant Cart Flow");

Scenario("Add two different colored variants to cart", async ({ I }) => {
  const product = dataset[0];

  if (!product || !product.url || product.url.trim().length === 0) {
    console.log("NO_DATASET_URL=TRUE");
    return;
  }

  const firstColor = product.metadata.expectedColors[0];
  const secondColor = product.metadata.expectedColors[1];

  I.amOnPage(product.url);

  await selectColorVariant(I, firstColor);
  await verifyColorSelectionApplied(I, firstColor);
  await addCurrentVariantToCart(I);

  I.amOnPage(product.url);

  await selectColorVariant(I, secondColor);
  await verifyColorSelectionApplied(I, secondColor);
  await addCurrentVariantToCart(I);

  await openCart(I);

  await assertCartContainsColor(I, firstColor);
  await assertCartContainsColor(I, secondColor);
});

Scenario("Remove one color variant and verify other remains", async ({ I }) => {
  const product = dataset[0];

  if (!product || !product.url || product.url.trim().length === 0) {
    console.log("NO_DATASET_URL=TRUE");
    return;
  }

  const firstColor = product.metadata.expectedColors[0];
  const secondColor = product.metadata.expectedColors[1];

  await openCart(I);
  await removeCartItemByColor(I, firstColor);
  await assertCartDoesNotContainColor(I, firstColor);
  await assertCartContainsColor(I, secondColor);
});

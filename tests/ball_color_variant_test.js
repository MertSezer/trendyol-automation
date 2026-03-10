const rawDataset = require("../datasets/trendyol_ball_variant_urls.json");
const dataset = Array.isArray(rawDataset) ? rawDataset : [rawDataset];

const {
  dismissBlockingOverlays,
  selectColorVariant,
  verifyColorSelectionApplied,
  addCurrentVariantToCart,
  openCart,
  dumpCartState,
  assertCartPageLoaded,
  assertRemovalFeedback,
  removeAnyCartItem
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
  await dismissBlockingOverlays(I);

  await selectColorVariant(I, firstColor);
  await verifyColorSelectionApplied(I, firstColor);
  await addCurrentVariantToCart(I);

  I.amOnPage(product.url);
  await dismissBlockingOverlays(I);

  await selectColorVariant(I, secondColor);
  await verifyColorSelectionApplied(I, secondColor);
  await addCurrentVariantToCart(I);

  await openCart(I);
  await dumpCartState(I, 'after_two_variant_adds');
  await assertCartPageLoaded(I);
});

Scenario("Remove one cart item and verify removal feedback", async ({ I }) => {
  const product = dataset[0];

  if (!product || !product.url || product.url.trim().length === 0) {
    console.log("NO_DATASET_URL=TRUE");
    return;
  }

  I.amOnPage(product.url);
  await dismissBlockingOverlays(I);

  await addCurrentVariantToCart(I);

  await openCart(I);
  await dumpCartState(I, 'before_remove_flow');

  await removeAnyCartItem(I);
  await assertRemovalFeedback(I, 'Beyaz');
});

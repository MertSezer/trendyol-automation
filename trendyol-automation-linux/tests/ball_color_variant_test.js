const rawDataset = require("../datasets/trendyol_ball_variant_urls.json");
const dataset = Array.isArray(rawDataset) ? rawDataset : [rawDataset];

const ProductPage = require("../pages/ProductPage");
const CartPage = require("../pages/CartPage");
const VariantSelector = require("../pages/VariantSelector");

Feature("Trendyol Ball Color Variant Cart Flow");

Scenario("Add two different colored variants to cart", async () => {
  const product = dataset[0];

  if (!product || !product.url || product.url.trim().length === 0) {
    console.log("NO_DATASET_URL=TRUE");
    return;
  }

  const firstColor = product.metadata.expectedColors[0];
  const secondColor = product.metadata.expectedColors[1];

  ProductPage.open(product.url);
  await ProductPage.dismissBlockingOverlays();

  await ProductPage.addToCart();

  ProductPage.open(product.url);
  await ProductPage.dismissBlockingOverlays();

  await VariantSelector.selectColor(secondColor);
  await VariantSelector.verifySelected(secondColor);
  await ProductPage.addToCart();

  await CartPage.open();
  await CartPage.dumpState('after_two_variant_adds');
  await CartPage.assertLoaded();
});

Scenario("Remove one cart item and verify removal feedback", async () => {
  const product = dataset[0];

  if (!product || !product.url || product.url.trim().length === 0) {
    console.log("NO_DATASET_URL=TRUE");
    return;
  }

  ProductPage.open(product.url);
  await ProductPage.dismissBlockingOverlays();

  await ProductPage.addToCart();

  await CartPage.open();
  await CartPage.dumpState('before_remove_flow');

  await CartPage.removeAnyItem();
  await CartPage.assertRemovalFeedback('Beyaz');
});

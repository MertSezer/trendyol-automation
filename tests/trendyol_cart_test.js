require("dotenv").config({ override: true });
const ProductPage = require("../pages/ProductPage");
const CartPage = require("../pages/CartPage");

Feature("Trendyol - E2E (no payment completion)");

Scenario("URL -> add to cart -> cart -> checkout screenshot (no payment)", async () => {
  const productUrl = process.env.PRODUCT_URL;
  const color = process.env.COLOR || "";
  const size  = process.env.SIZE || "";

  if (!productUrl || productUrl.includes("....") || productUrl.includes("<") || productUrl.includes("GERCEK")) {
    throw new Error("PRODUCT_URL gerçek bir Trendyol ürün linki olmalı (placeholder olamaz)");
  }

  await ProductPage.open(productUrl);
  await ProductPage.prepare();
  await ProductPage.selectVariants(color, size);

  await ProductPage.addToCart();
  await CartPage.goToCart();
  await CartPage.verifyAndScreenshot();
  await CartPage.goToCheckout();
});

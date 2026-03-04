require("dotenv").config({ override: true });
const { I } = inject();
const makeUI = require("../helpers/ui");
const makeProduct = require("../pages/ProductPage");
const makeCart = require("../pages/CartPage");

function ball(color, step, note = "") {
  const emoji = color === "GREEN" ? "GREEN" : color === "WHITE" ? "WHITE" : "BLACK";
  console.log(`[${emoji}] [${step}] ${note}`);
}

Feature("Trendyol - E2E (no payment completion)");

Scenario("URL -> add to cart -> cart -> checkout screenshot (no payment)", async () => {
  const productUrl = process.env.PRODUCT_URL;
  const color = process.env.COLOR || "";
  const size  = process.env.SIZE || "";

  if (!productUrl || productUrl.includes("....") || productUrl.includes("<") || productUrl.includes("GERCEK")) {
    throw new Error("PRODUCT_URL gerçek bir Trendyol ürün linki olmalı (placeholder olamaz)");
  }

  const ui = makeUI({ I, ball });
  const ProductPage = makeProduct({ I, ui, ball });
  const CartPage = makeCart({ I, ui, ball });

  await ProductPage.open(productUrl);
  await ProductPage.prepare();
  await ProductPage.selectVariants(color, size);

  await ProductPage.addToCart();
  await CartPage.goToCart();
  await CartPage.verifyAndScreenshot();
  await CartPage.goToCheckout(); // no payment, only screenshot
});

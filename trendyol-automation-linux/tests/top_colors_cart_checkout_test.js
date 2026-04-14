const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { I } = inject();

const makeUI = require("../helpers/ui");
const ProductPage = require("../pages/ProductPageProxy");
const CartPage = require("../pages/CartPage");

function ball(color, step, note = "") {
  const emoji = color === "GREEN" ? "GREEN" : color === "WHITE" ? "WHITE" : "BLACK";
  console.log(`[${emoji}] [${step}] ${note}`);
}

Feature("Trendyol - Top Colors Loop (no payment)");

Scenario("Colors loop -> add to cart -> cart -> checkout", async () => {
  const productUrl = (process.env.PRODUCT_URL ?? process.env["\ufeffPRODUCT_URL"] ?? "").trim();
  console.log("DEBUG PRODUCT_URL =", JSON.stringify(productUrl));

  const size = (process.env.SIZE || "").trim();

  if (!/^https:\/\/www\.trendyol\.com\/.+-p-\d+/.test(productUrl)) {
    throw new Error(`PRODUCT_URL geçersiz: ${JSON.stringify(productUrl)}`);
  }

  const ui = makeUI({ I, ball });
  const colors = ["Mavi", "Yeşil", "Sarı", "Beyaz", "Siyah"];

  await CartPage.goToCart();
  try { await CartPage.clearCartBestEffort(); } catch {}

  for (const color of colors) {
    ball("GREEN", "ITER", `color=${color} size=${size || "(none)"}`);

    await ProductPage.open(productUrl);
    if (typeof ProductPage.prepare === "function") {
      await ProductPage.prepare();
    }

    if (color) {
      let ok = false;

      if (typeof ProductPage.selectColorSmart === "function") {
        ok = await ProductPage.selectColorSmart(color);
      } else if (typeof ui.safeClickText === "function") {
        ok = await ui.safeClickText(color);
      }

      if (!ok) {
        ball("WHITE", "COLOR_SKIP", `not selectable: ${color}`);
        I.saveScreenshot(`01_color_skip_${color}.png`);
        continue;
      }

      ball("GREEN", "COLOR", color);
    }

    if (size && typeof ui.safeClickText === "function") {
      const ok = await ui.safeClickText(size);
      ball(ok ? "GREEN" : "WHITE", "SIZE", size);
    }

    I.wait(1);
    I.saveScreenshot(`01_after_variant_${color}.png`);

    await ProductPage.addToCart();

    await CartPage.goToCart();
    await CartPage.verifyAndScreenshot();
    await CartPage.goToCheckout();

    await CartPage.goToCart();
    const cleared = await CartPage.clearCartBestEffort();
    if (!cleared) {
      I.saveScreenshot(`cart_clear_failed_${color}.png`);
      throw new Error(`Cart cleanup failed after color=${color}`);
    }
  }
});

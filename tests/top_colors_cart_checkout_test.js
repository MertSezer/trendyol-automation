const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { I } = inject();

const makeUI = require("../helpers/ui");
const makeProduct = require("../pages/ProductPage");
const makeCart = require("../pages/CartPage");

function ball(color, step, note = "") {
  const emoji = color === "GREEN" ? "GREEN" : color === "WHITE" ? "WHITE" : "BLACK";
  console.log(`[${emoji}] [${step}] ${note}`);
}

Feature("Trendyol - Top Colors Loop (no payment)");

Scenario("Colors loop -> add to cart -> cart -> checkout", async () => {
  const productUrl = process.env.PRODUCT_URL;
console.log("DEBUG PRODUCT_URL =", JSON.stringify(productUrl));
  const size = (process.env.SIZE || "").trim();

  if (!productUrl || productUrl.includes("....") || productUrl.includes("<") || productUrl.includes("GERCEK")) {
    throw new Error("PRODUCT_URL gerçek bir Trendyol ürün linki olmalı (placeholder olamaz)");
  }

  const ui = makeUI({ I, ball });
  const ProductPage = makeProduct({ I, ui, ball });
  const CartPage = makeCart({ I, ui, ball });

  // İstenen renkler (üründe yoksa SKIP)
  const colors = ["Mavi", "Yeşil", "Sarı", "Beyaz", "Siyah"];

  // (opsiyonel) başta sepeti boşalt
  await CartPage.goToCart();
  try { await CartPage.clearCartBestEffort(); } catch {}

  for (const color of colors) {
    ball("GREEN", "ITER", `color=${color} size=${size || "(none)"}`);

    await ProductPage.open(productUrl);
    await ProductPage.prepare();

    // Renk/beden seçimi: seçilemezse fail etme, SKIP et
    if (color) {
      const ok = await ui.safeClickText(color);
      if (!ok) {
        ball("WHITE", "COLOR_SKIP", `not selectable: ${color}`);
        I.saveScreenshot(`01_color_skip_${color}.png`);
        continue;
      }
      ball("GREEN", "COLOR", color);
    }

    if (size) {
      const ok = await ui.safeClickText(size);
      ball(ok ? "GREEN" : "WHITE", "SIZE", size);
    }

    I.wait(1);
    I.saveScreenshot(`01_after_variant_${color}.png`);

    await ProductPage.addToCart();

    await CartPage.goToCart();
    await CartPage.verifyAndScreenshot();
    await CartPage.goToCheckout();

    // Bir sonraki iterasyona temiz başla
    await CartPage.goToCart();
    const cleared = await CartPage.clearCartBestEffort();
    if (!cleared) {
      I.saveScreenshot(`cart_clear_failed_${color}.png`);
      throw new Error(`Cart cleanup failed after color=${color}`);
    }
  }
});



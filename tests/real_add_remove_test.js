Feature("Trendyol - Real Scenario (I only)");

Scenario("Product URL -> add to cart -> cart -> remove -> empty", async ({ I, CartPage }) => {
  const url = process.env.PRODUCT_URL;
  if (!url) throw new Error("PRODUCT_URL missing (.env or env var)");

  I.amOnPage(url);
  I.wait(3);

  // best-effort: cookie/modal kapat
  await I.executeScript(() => {
    const needles = ["Kabul Et", "Tümünü Kabul Et", "Anladım", "Tamam", "Kapat", "Close"];
    const tags = ["button","a","div","span"];
    const nodes = [];
    for (const t of tags) nodes.push(...document.querySelectorAll(t));
    for (const n of needles) {
      for (const el of nodes) {
        const txt = (el.innerText || el.textContent || "").trim();
        if (!txt) continue;
        if (!txt.includes(n)) continue;
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        const visible = r.width>0 && r.height>0 && st.display!=="none" && st.visibility!=="hidden" && st.opacity!=="0";
        if (!visible) continue;
        el.click();
        return true;
      }
    }
    return false;
  });

  // Sepete ekle (text üzerinden)
  const added = await I.executeScript(() => {
    const needles = ["Sepete Ekle", "Sepete ekle", "Add to cart"];
    const tags = ["button","a","div","span"];
    const nodes = [];
    for (const t of tags) nodes.push(...document.querySelectorAll(t));
    for (const n of needles) {
      for (const el of nodes) {
        const txt = (el.innerText || el.textContent || "").trim();
        if (!txt) continue;
        if (!txt.includes(n)) continue;
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        const visible = r.width>0 && r.height>0 && st.display!=="none" && st.visibility!=="hidden" && st.opacity!=="0";
        if (!visible) continue;
        el.scrollIntoView({ block: "center", inline: "center" });
        el.click();
        return true;
      }
    }
    return false;
  });

  if (!added) {
    I.saveScreenshot("add_to_cart_not_found.png");
    throw new Error("Add to cart button not found/clicked");
  }

  I.wait(2);
  I.saveScreenshot("01_after_add_to_cart.png");

  await CartPage.goToCart();
  await CartPage.verifyAndScreenshot();

  await CartPage.removeFromCart();
  await CartPage.verifyEmpty();
  I.saveScreenshot("04_cart_empty.png");
});

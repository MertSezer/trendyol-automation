module.exports = {
  async verifyAndScreenshot() {
    return await this.screenshotCart("02_cart_page.png");
  },

  async goToCart() {
    const { I } = inject();
    I.amOnPage("/sepetim");
    I.wait(2);
    I.seeInCurrentUrl("sepet");
  },

  async verifyCartLoaded() {
    const { I } = inject();
    I.seeInCurrentUrl("sepet");
    I.see("Sepetim");
  },

  async screenshotCart(name = "02_cart_page.png") {
    const { I } = inject();
    await this.verifyCartLoaded();
    I.wait(1);
    I.saveScreenshot(name);
  },

  async screenshotCheckout(name = "03_checkout_page.png") {
    const { I } = inject();
    I.wait(1);
    I.saveScreenshot(name);
  },

  async goToCheckout(checkoutShot = "03_checkout_page.png") {
    const { I } = inject();
    I.seeInCurrentUrl("sepet");

    const clicked = await I.executeScript((needle) => {
      try {
        const tags = ["button","a","div","span"];
        const nodes = [];
        for (const tag of tags) nodes.push(...document.querySelectorAll(tag));
        for (const el of nodes) {
          const txt = (el.innerText || el.textContent || "").trim();
          if (!txt) continue;
          if (!txt.includes(needle)) continue;

          const r = el.getBoundingClientRect();
          const st = window.getComputedStyle(el);
          const visible =
            r.width > 0 &&
            r.height > 0 &&
            st.display !== "none" &&
            st.visibility !== "hidden" &&
            st.opacity !== "0";
          if (!visible) continue;

          el.scrollIntoView({ block: "center", inline: "center" });
          el.click();
          return true;
        }
        return false;
      } catch { return false; }
    }, "Sepeti Onayla");

    if (!clicked) {
      I.saveScreenshot("checkout_click_not_found.png");
      throw new Error("CHECKOUT_BUTTON_NOT_FOUND");
    }

    I.wait(2);
    await this.screenshotCheckout(checkoutShot);

    const url = await I.grabCurrentUrl().catch(() => "");

    const signals = await I.executeScript(() => {
      const t = (document.body?.innerText || "").toLowerCase();
      const has = (s) => t.includes(s);
      return {
        url: location.href,
        hasLogin: has("giriş yap") || has("uye girisi") || has("üye girişi") || has("login"),
        hasAddress: has("adres") || has("teslimat") || has("teslimat adresi"),
        hasPayment: has("ödeme") || has("payment"),
        stillCartButton: !!Array.from(document.querySelectorAll("button,a,div,span"))
          .some(el => ((el.innerText || el.textContent || "").trim()).includes("Sepeti Onayla"))
      };
    });

    if (url && !url.includes("/sepetim")) return { status: "CHECKOUT", url };
    if (signals.hasLogin) return { status: "LOGIN_GATE", url: signals.url };
    if (signals.hasAddress || signals.hasPayment) return { status: "CHECKOUT", url: signals.url };
    if (signals.stillCartButton) throw new Error("CHECKOUT_NOT_REACHED");

    I.wait(2);
    const url2 = await I.grabCurrentUrl().catch(() => "");
    if (url2 && !url2.includes("/sepetim")) return { status: "CHECKOUT", url: url2 };

    throw new Error("CHECKOUT_NOT_REACHED");
  },

  async clearCartBestEffort() {
    const { I } = inject();
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      try {
        await this.verifyEmpty();
        return true;
      } catch {}

      try {
        await this.removeFromCart();
      } catch {}

      I.wait(1);

      try {
        await this.verifyEmpty();
        return true;
      } catch {}
    }

    return false;
  },

  async removeFromCart() {
    const { I } = inject();
    const needles = ["Sil", "Kaldır", "Ürünü Sil", "Sepetten Kaldır", "Remove", "Delete"];

    for (const needle of needles) {
      const clicked = await I.executeScript((needle) => {
        try {
          const tags = ["button", "a", "div", "span"];
          const nodes = [];
          for (const tag of tags) nodes.push(...document.querySelectorAll(tag));
          for (const el of nodes) {
            const txt = (el.innerText || el.textContent || "").trim();
            if (!txt) continue;
            if (!txt.includes(needle)) continue;

            const r = el.getBoundingClientRect();
            const st = window.getComputedStyle(el);
            const visible = r.width > 0 && r.height > 0 && st.display !== "none" && st.visibility !== "hidden" && st.opacity !== "0";
            if (!visible) continue;

            el.scrollIntoView({ block: "center", inline: "center" });
            el.click();
            return true;
          }
          return false;
        } catch { return false; }
      }, needle).catch(() => false);

      if (clicked) {
        I.wait(1);
        return;
      }
    }

    I.saveScreenshot("remove_from_cart_not_found.png");
    throw new Error("REMOVE_BUTTON_NOT_FOUND");
  },

  async verifyEmpty() {
    const { I } = inject();
    I.seeInCurrentUrl("sepet");

    const emptyHints = [
      "Sepetin boş",
      "Sepetiniz boş",
      "Sepetinizde ürün bulunmamaktadır",
      "Sepette ürün yok"
    ];

    const itemSelectors = [
      '[data-testid*="basket"] [data-testid*="item"]',
      ".pb-basket-item",
      ".basket-item",
      ".ty-basket-item"
    ];

    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      for (const t of emptyHints) {
        const n = await I.grabNumberOfVisibleElements(locate("body").withText(t)).catch(() => 0);
        if (n > 0) return;
      }

      let anyItems = false;
      for (const sel of itemSelectors) {
        const n = await I.grabNumberOfVisibleElements(sel).catch(() => 0);
        if (n > 0) { anyItems = true; break; }
      }
      if (!anyItems) return;

      await I.wait(0.7);
    }

    I.saveScreenshot("cart_empty_timeout.png");
    throw new Error("EMPTY_CART_NOT_CONFIRMED");
  }
};

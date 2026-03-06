'use strict';

class ProductPage {
  constructor() {
    this.locators = {};
  }

  async open(url) {
    const { I } = inject();
    I.amOnPage(url);
    I.wait(2);
  }

  async prepare() {
    const { I } = inject();

    await I.executeScript(() => {
      try {
        const texts = [
          "Kabul Et",
          "Tümünü Kabul Et",
          "Anladım",
          "Tamam",
          "Accept",
          "Close",
          "Kapat"
        ];

        const tags = ["button", "a", "div", "span"];
        const nodes = [];
        for (const tag of tags) nodes.push(...document.querySelectorAll(tag));

        for (const el of nodes) {
          const txt = (el.innerText || el.textContent || "").trim();
          if (!txt) continue;
          if (!texts.some(t => txt.includes(t))) continue;

          const r = el.getBoundingClientRect();
          const st = window.getComputedStyle(el);
          const visible =
            r.width > 0 &&
            r.height > 0 &&
            st.display !== "none" &&
            st.visibility !== "hidden" &&
            st.opacity !== "0";

          if (!visible) continue;

          try {
            el.scrollIntoView({ block: "center", inline: "center" });
            el.click();
          } catch {}
        }
      } catch {}
    }).catch(() => {});

    I.wait(1);
  }

  async addToCart() {
    const { I } = inject();

    const clicked = await I.executeScript(() => {
      try {
        const needles = ["Sepete Ekle", "Sepete ekle", "Add to cart"];
        const tags = ["button", "a", "div", "span"];
        const nodes = [];
        for (const tag of tags) nodes.push(...document.querySelectorAll(tag));

        for (const el of nodes) {
          const txt = (el.innerText || el.textContent || "").trim();
          if (!txt) continue;
          if (!needles.some(n => txt.includes(n))) continue;

          const r = el.getBoundingClientRect();
          const st = window.getComputedStyle(el);
          const visible =
            r.width > 0 &&
            r.height > 0 &&
            st.display !== "none" &&
            st.visibility !== "hidden" &&
            st.opacity !== "0";

          if (!visible) continue;

          try {
            el.scrollIntoView({ block: "center", inline: "center" });
            el.click();
            return true;
          } catch {}
        }

        return false;
      } catch {
        return false;
      }
    });

    if (!clicked) {
      I.saveScreenshot("add_to_cart_not_found.png");
      throw new Error("ADD_TO_CART_NOT_FOUND");
    }

    I.wait(2);
  }
}

module.exports = new ProductPage();

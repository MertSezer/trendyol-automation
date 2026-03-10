const { I } = inject();
const ProductPage = require("./ProductPage");

class VariantSelector {
  constructor() {
    this.strictSelectors = [
      '[data-testid*="variant"]',
      '[data-testid*="color"]',
      '[class*="variant"] button',
      '[class*="variant"] [role="button"]',
      '[class*="variant"] div',
      '[class*="color"] button',
      '[class*="color"] [role="button"]',
      '[class*="color"] div',
      '[aria-label*="renk"]',
      'button[aria-label*="renk"]',
      '[role="button"][aria-label*="renk"]'
    ];
  }

  async selectColor(colorName) {
    await ProductPage.dismissBlockingOverlays();
    I.wait(1);

    console.log(`SELECT_COLOR_START=${colorName}`);

    for (const selector of this.strictSelectors) {
      try {
        const candidate = locate(selector).withText(colorName);
        const count = await I.grabNumberOfVisibleElements(candidate);

        if (count > 0) {
          console.log(`SELECT_COLOR_MATCH_SELECTOR=${selector}`);
          const clicked = await ProductPage.robustClick(candidate);

          if (clicked) {
            I.wait(2);

            const urlAfterClick = await I.grabCurrentUrl();
            console.log(`SELECT_COLOR_CLICKED=${colorName}`);
            console.log(`SELECT_COLOR_URL_AFTER=${urlAfterClick}`);

            return true;
          }
        }
      } catch (e) {}
    }

    const clickedByJs = await I.executeScript((targetColor) => {
      const norm = (s) =>
        (s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const wanted = norm(targetColor);

      const visible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          r.width >= 12 &&
          r.height >= 12 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };

      const selectors = [
        '[data-testid*="variant"]',
        '[data-testid*="color"]',
        '[class*="variant"]',
        '[class*="color"]',
        '[aria-label*="renk"]'
      ];

      const ownText = (el) => {
        const aria = el.getAttribute("aria-label") || "";
        const title = el.getAttribute("title") || "";
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        return `${aria} ${title} ${text}`.trim();
      };

      for (const rootSelector of selectors) {
        const roots = Array.from(document.querySelectorAll(rootSelector));

        for (const root of roots) {
          const nodes = [
            root,
            ...Array.from(
              root.querySelectorAll('button, [role="button"], div, span, a')
            )
          ];

          for (const node of nodes) {
            if (!visible(node)) continue;

            const text = norm(ownText(node));
            if (!text) continue;

            if (
              text === wanted ||
              text.startsWith(wanted) ||
              text.includes(` ${wanted}`) ||
              text.includes(`${wanted} `)
            ) {
              try {
                node.scrollIntoView({ block: "center", inline: "center" });
                node.click();
                return true;
              } catch (_) {}
            }
          }
        }
      }

      return false;
    }, colorName);

    if (clickedByJs) {
      I.wait(2);
      console.log(`SELECT_COLOR_CLICKED_JS=${colorName}`);
      console.log(`SELECT_COLOR_URL_AFTER=${await I.grabCurrentUrl()}`);
      return true;
    }

    throw new Error(`COLOR_VARIANT_NOT_FOUND=${colorName}`);
  }

  async verifySelected(colorName) {
    await ProductPage.dismissBlockingOverlays();
    I.wait(1);

    const currentUrl = await I.grabCurrentUrl();
    console.log(`VERIFY_SELECTED_COLOR=${colorName}`);
    console.log(`VERIFY_SELECTED_URL=${currentUrl}`);

    try {
      I.see(colorName);
    } catch (e) {
      throw new Error(`COLOR_NOT_VISIBLE_AS_SELECTED=${colorName}`);
    }
  }
}

module.exports = new VariantSelector();
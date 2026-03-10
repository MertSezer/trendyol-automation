const { I } = inject();

class ProductPage {
  open(url) {
    I.amOnPage(url);
  }

  async dismissBlockingOverlays() {
    const selectors = [
      '[data-testid="overlay"]',
      '.onboarding-tour__overlay',
      '.onboarding-tour',
      '[class*="overlay"]',
      '[class*="social-proof"]',
      '.social-proof-item-focused-text',
      '.social-proof-item',
      '[class*="tooltip"]',
      '[class*="popover"]',
      '[class*="modal"]',
      '[class*="backdrop"]',
      '[class*="drawer"]',
      '[class*="dropdown"]',
      '[class*="dropdown-item"]',
      '[class*="floating"]'
    ];

    for (const selector of selectors) {
      try {
        const count = await I.grabNumberOfVisibleElements(selector);
        if (count > 0) {
          I.executeScript((sel) => {
            document.querySelectorAll(sel).forEach((el) => el.remove());
          }, selector);
          I.wait(1);
        }
      } catch (e) {}
    }

    const closeCandidates = [
      'button[aria-label="Kapat"]',
      'button[title="Kapat"]',
      '.onboarding-tour__close',
      '[data-testid*="close"]'
    ];

    for (const candidate of closeCandidates) {
      try {
        const count = await I.grabNumberOfVisibleElements(candidate);
        if (count > 0) {
          I.click(candidate);
          I.wait(1);
        }
      } catch (e) {}
    }
  }

  async exists(locatorOrSelector) {
    try {
      const count = await I.grabNumberOfVisibleElements(locatorOrSelector);
      return count > 0;
    } catch (e) {
      return false;
    }
  }

  async robustClick(locatorOrSelector) {
    await this.dismissBlockingOverlays();

    const targets = Array.isArray(locatorOrSelector)
      ? locatorOrSelector
      : [locatorOrSelector];

    for (const target of targets) {
      try {
        const present = await this.exists(target);
        if (!present && !(typeof target === "object" && target && target.xpath)) {
          continue;
        }
      } catch (e) {}

      try {
        I.scrollTo(target);
      } catch (e) {}

      I.wait(1);

      try {
        I.click(target);
        I.wait(1);
        return true;
      } catch (e) {}

      try {
        I.forceClick(target);
        I.wait(1);
        return true;
      } catch (e) {}

      try {
        const clicked = await I.executeScript((candidate) => {
          const blockers = [
            '[data-testid="overlay"]',
            '.onboarding-tour__overlay',
            '.onboarding-tour',
            '[class*="overlay"]',
            '[class*="social-proof"]',
            '.social-proof-item-focused-text',
            '.social-proof-item',
            '[class*="tooltip"]',
            '[class*="popover"]',
            '[class*="modal"]',
            '[class*="backdrop"]',
            '[class*="drawer"]',
            '[class*="dropdown"]',
            '[class*="dropdown-item"]',
            '[class*="floating"]'
          ];

          blockers.forEach((sel) => {
            document.querySelectorAll(sel).forEach((node) => node.remove());
          });

          let el = null;

          if (typeof candidate === "string") {
            el = document.querySelector(candidate);
          } else if (candidate && candidate.xpath) {
            el = document
              .evaluate(
                candidate.xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              )
              .singleNodeValue;
          }

          if (!el) return false;

          el.scrollIntoView({ block: "center", inline: "center" });
          el.click();
          return true;
        }, target);

        if (clicked) {
          I.wait(1);
          return true;
        }
      } catch (e) {}
    }

    return false;
  }

  async clickByTextHints(hints) {
    await this.dismissBlockingOverlays();

    const clickedLabel = await I.executeScript((rawHints) => {
      const norm = (s) =>
        (s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const hints = rawHints.map(norm);

      const ownText = (el) => {
        const aria = el.getAttribute("aria-label") || "";
        const title = el.getAttribute("title") || "";
        const value = el.getAttribute("value") || "";
        const directText = Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        return (aria || title || value || directText || "").trim();
      };

      const nodes = Array.from(
        document.querySelectorAll('button,a,div[role="button"],span[role="button"],div,span')
      );

      const candidates = [];

      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) continue;

        const raw = ownText(el);
        if (!raw) continue;

        const txt = norm(raw);
        const matched = hints.find(
          (h) => txt === h || txt.startsWith(h) || txt.includes(h)
        );

        if (!matched) continue;
        if (txt.length > 80) continue;

        let score = 0;
        if (txt === matched) score += 1000;
        else if (txt.startsWith(matched)) score += 700;
        else score += 400;

        if (el.tagName === "BUTTON") score += 200;
        if (el.getAttribute("role") === "button") score += 120;

        score -= txt.length;

        candidates.push({ el, raw, score });
      }

      candidates.sort((a, b) => b.score - a.score);

      const best = candidates[0];
      if (!best) return null;

      best.el.scrollIntoView({ block: "center", inline: "center" });
      best.el.click();
      return best.raw;
    }, hints);

    if (clickedLabel) {
      I.wait(2);
      return true;
    }

    return false;
  }

  async addToCart() {
    await this.dismissBlockingOverlays();

    const selectorCandidates = [
      '[data-testid="add-to-cart-button"]',
      '[data-testid*="add-to-cart"]',
      '[data-testid*="add-to-basket"]',
      'button[class*="add-to-cart"]',
      'button[class*="add-to-basket"]',
      'button[class*="basket"]'
    ];

    const directClicked = await this.robustClick(selectorCandidates);
    if (directClicked) {
      I.wait(2);
      return true;
    }

    const locatorCandidates = [
      locate("button").withText("Sepete Ekle"),
      locate("button").withText("Sepete ekle"),
      locate("button").withText("Add to Cart"),
      locate("button").withText("Add to Basket"),
      locate("a").withText("Sepete Ekle")
    ];

    for (const candidate of locatorCandidates) {
      try {
        const clicked = await this.robustClick(candidate);
        if (clicked) {
          I.wait(2);
          return true;
        }
      } catch (e) {}
    }

    const clickedByText = await this.clickByTextHints([
      "sepete ekle",
      "add to cart",
      "add to basket"
    ]);

    if (clickedByText) {
      I.wait(2);
      return true;
    }

    throw new Error("ADD_TO_CART_BUTTON_NOT_FOUND");
  }
}

module.exports = new ProductPage();

const { I } = inject();
const ProductPage = require("./ProductPage");

class VariantSelector {
  constructor() {
    this.strictSelectors = [
      '[data-testid*="variant"]',
      '[data-testid*="color"]',
      '[data-testid*="colour"]',
      '[class*="variant"] button',
      '[class*="variant"] [role="button"]',
      '[class*="variant"] div',
      '[class*="color"] button',
      '[class*="color"] [role="button"]',
      '[class*="color"] div',
      '[class*="colour"] button',
      '[class*="colour"] [role="button"]',
      '[class*="colour"] div',
      '[aria-label*="renk"]',
      'button[aria-label*="renk"]',
      '[role="button"][aria-label*="renk"]',
      '[title*="Siyah"]',
      '[title*="Beyaz"]'
    ];
  }

  normalize(value) {
    return (value || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async dumpColorCandidates(targetColor) {
    try {
      const candidates = await I.executeScript((wantedRaw) => {
        const norm = (s) =>
          (s || "")
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();

        const wanted = norm(wantedRaw);

        const visible = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return (
            r.width >= 8 &&
            r.height >= 8 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        };

        const getTextBag = (el) => {
          if (!el) return "";
          const attrs = [
            el.getAttribute("aria-label") || "",
            el.getAttribute("title") || "",
            el.getAttribute("data-testid") || "",
            el.getAttribute("data-color") || "",
            el.getAttribute("data-variant") || "",
            el.getAttribute("value") || "",
            el.textContent || ""
          ];

          const img = el.querySelector && el.querySelector("img");
          if (img) {
            attrs.push(img.getAttribute("alt") || "");
            attrs.push(img.getAttribute("title") || "");
          }

          const parent = el.parentElement;
          if (parent) {
            attrs.push(parent.getAttribute("aria-label") || "");
            attrs.push(parent.getAttribute("title") || "");
            attrs.push(parent.textContent || "");
          }

          return attrs.join(" | ").replace(/\s+/g, " ").trim();
        };

        const selectors = [
          '[data-testid*="variant"]',
          '[data-testid*="color"]',
          '[data-testid*="colour"]',
          '[class*="variant"]',
          '[class*="color"]',
          '[class*="colour"]',
          '[aria-label*="renk"]',
          'button',
          '[role="button"]',
          'label',
          'img'
        ];

        const found = [];

        for (const selector of selectors) {
          const nodes = Array.from(document.querySelectorAll(selector));
          for (const node of nodes) {
            if (!visible(node)) continue;
            const bag = getTextBag(node);
            const nbag = norm(bag);
            if (!nbag) continue;

            if (
              nbag.includes(wanted) ||
              nbag.includes(`renk: ${wanted}`) ||
              nbag.includes(`${wanted} populer`) ||
              nbag.includes(` ${wanted} `)
            ) {
              found.push({
                selector,
                tag: node.tagName,
                text: bag.slice(0, 220)
              });
            }
          }
        }

        return found.slice(0, 20);
      }, targetColor);

      console.log(`COLOR_CANDIDATES_FOR_${targetColor}=${JSON.stringify(candidates)}`);
    } catch (e) {
      console.log(`COLOR_CANDIDATE_DUMP_FAILED=${e.message}`);
    }
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
          .toString()
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
          r.width >= 8 &&
          r.height >= 8 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };

      const getTextBag = (el) => {
        if (!el) return "";
        const parts = [
          el.getAttribute("aria-label") || "",
          el.getAttribute("title") || "",
          el.getAttribute("data-testid") || "",
          el.getAttribute("data-color") || "",
          el.getAttribute("data-variant") || "",
          el.textContent || ""
        ];

        const img = el.querySelector && el.querySelector("img");
        if (img) {
          parts.push(img.getAttribute("alt") || "");
          parts.push(img.getAttribute("title") || "");
        }

        const parent = el.parentElement;
        if (parent) {
          parts.push(parent.getAttribute("aria-label") || "");
          parts.push(parent.getAttribute("title") || "");
          parts.push(parent.textContent || "");
        }

        return parts.join(" | ").replace(/\s+/g, " ").trim();
      };

      const clickNode = (node) => {
        if (!node) return false;
        try {
          node.scrollIntoView({ block: "center", inline: "center" });
        } catch (_) {}

        const clickable =
          node.closest('button, [role="button"], a, label') ||
          node.parentElement ||
          node;

        try {
          clickable.click();
          return true;
        } catch (_) {}

        try {
          node.click();
          return true;
        } catch (_) {}

        return false;
      };

      const selectors = [
        '[data-testid*="variant"]',
        '[data-testid*="color"]',
        '[data-testid*="colour"]',
        '[class*="variant"]',
        '[class*="color"]',
        '[class*="colour"]',
        '[aria-label*="renk"]',
        'button',
        '[role="button"]',
        'label',
        'img'
      ];

      const candidates = [];

      for (const selector of selectors) {
        const nodes = Array.from(document.querySelectorAll(selector));

        for (const node of nodes) {
          if (!visible(node)) continue;

          const raw = getTextBag(node);
          const txt = norm(raw);
          if (!txt) continue;

          const exact =
            txt === wanted ||
            txt.includes(`renk: ${wanted}`) ||
            txt.includes(`| ${wanted} |`) ||
            txt.startsWith(`${wanted} `) ||
            txt.endsWith(` ${wanted}`) ||
            txt.includes(wanted);

          if (!exact) continue;

          let score = 0;
          if (txt === wanted) score += 2000;
          if (txt.includes(`renk: ${wanted}`)) score += 1500;
          if (txt.includes(wanted)) score += 500;
          if (selector.includes("variant")) score += 400;
          if (selector.includes("color")) score += 400;
          if (selector.includes("colour")) score += 400;
          if (node.tagName === "BUTTON") score += 200;
          if (node.getAttribute("role") === "button") score += 150;
          if (node.tagName === "IMG") score += 100;

          score -= Math.min(txt.length, 300);

          candidates.push({ node, raw, score, selector });
        }
      }

      candidates.sort((a, b) => b.score - a.score);

      for (const item of candidates.slice(0, 10)) {
        if (clickNode(item.node)) {
          return {
            clicked: true,
            selector: item.selector,
            raw: item.raw
          };
        }
      }

      return {
        clicked: false,
        candidateCount: candidates.length,
        topCandidates: candidates.slice(0, 10).map((x) => ({
          selector: x.selector,
          raw: x.raw,
          score: x.score
        }))
      };
    }, colorName);

    if (clickedByJs && clickedByJs.clicked) {
      I.wait(2);
      console.log(`SELECT_COLOR_CLICKED_JS=${colorName}`);
      console.log(`SELECT_COLOR_MATCH_RAW=${clickedByJs.raw}`);
      console.log(`SELECT_COLOR_MATCH_SELECTOR=${clickedByJs.selector}`);
      console.log(`SELECT_COLOR_URL_AFTER=${await I.grabCurrentUrl()}`);
      return true;
    }

    await this.dumpColorCandidates(colorName);

    if (clickedByJs && !clickedByJs.clicked) {
      console.log(`SELECT_COLOR_TOP_CANDIDATES=${JSON.stringify(clickedByJs.topCandidates || [])}`);
    }

    throw new Error(`COLOR_VARIANT_NOT_FOUND=${colorName}`);
  }

  async verifySelected(colorName) {
    await ProductPage.dismissBlockingOverlays();
    I.wait(1);

    const currentUrl = await I.grabCurrentUrl();
    const bodyText = await I.grabTextFrom("body");

    console.log(`VERIFY_SELECTED_COLOR=${colorName}`);
    console.log(`VERIFY_SELECTED_URL=${currentUrl}`);

    const normalizedBody = this.normalize(bodyText);
    const normalizedColor = this.normalize(colorName);

    if (
      normalizedBody.includes(`renk: ${normalizedColor}`) ||
      normalizedBody.includes(normalizedColor)
    ) {
      return true;
    }

    throw new Error(`COLOR_NOT_VISIBLE_AS_SELECTED=${colorName}`);
  }
}

module.exports = new VariantSelector();
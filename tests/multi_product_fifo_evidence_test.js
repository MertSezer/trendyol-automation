const fs = require("fs");
const path = require("path");

Feature("Trendyol - Multi Product FIFO Evidence Scenario");

function writeStepNote(name, lines) {
  const filePath = path.join("output", `${name}.txt`);
  const content = Array.isArray(lines) ? lines.join("\n") : String(lines);
  fs.writeFileSync(filePath, content, "utf8");
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function loadProducts() {
  const filePath = path.join(process.cwd(), "products.json");
  if (!fs.existsSync(filePath)) {
    throw new Error("products.json not found");
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data) || data.length < 4) {
    throw new Error("products.json must contain at least 4 products");
  }

  return data.filter(x => x && x.url);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

Scenario("Add products one by one, keep only last 3 in cart, capture evidence on every page", async ({ I, ProductPage }) => {
  const products = loadProducts();
  const cartLimit = Number(process.env.CART_LIMIT || 3);
  const cartUrl = "https://www.trendyol.com/sepetim";

  async function goToCartDirect() {
    await I.amOnPage(cartUrl);
    await I.wait(2);

    const cleanupSelectors = [
      '[data-testid="overlay"]',
      '.onboarding-tour__overlay',
      '.onboarding-tour',
      '[class*="overlay"]',
      '[class*="social-proof"]',
      '[class*="tooltip"]',
      '[class*="popover"]',
      '[class*="modal"]',
      '[class*="dropdown"]'
    ];

    for (const sel of cleanupSelectors) {
      try {
        await I.executeScript((s) => {
          document.querySelectorAll(s).forEach((el) => el.remove());
        }, sel);
      } catch (_) {}
    }

    await I.wait(1);
  }

  async function getCartRows() {
    await goToCartDirect();

    const rows = await I.executeScript(() => {
      const normalize = (s) =>
        String(s || "")
          .replace(/\s+/g, " ")
          .trim();

      const rowSelectors = [
        '[class*="pb-basket-item"]',
        '[class*="basket-item"]',
        '[class*="BasketItem"]',
        'li'
      ];

      const titleSelectors = [
        '[data-testid="product-name"]',
        '[class*="product-name"]',
        '[class*="prdct-desc-cntnr-name"]',
        '.pb-basket-item-text',
        '.basket-product-name',
        'a[href*="/p-"]'
      ];

      const out = [];
      const seen = new Set();

      for (const rowSel of rowSelectors) {
        const rows = Array.from(document.querySelectorAll(rowSel));
        for (const row of rows) {
          let title = "";

          for (const titleSel of titleSelectors) {
            const el = row.querySelector(titleSel);
            if (el) {
              const t = normalize(el.innerText || el.textContent || "");
              if (t && t.length >= 2 && t.length <= 220) {
                title = t;
                break;
              }
            }
          }

          const rowText = normalize(row.innerText || row.textContent || "");
          if (!title && !rowText) continue;

          const key = `${title}|||${rowText.slice(0,150)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          out.push({
            title,
            rowText: rowText.slice(0, 500)
          });
        }
      }

      return out;
    });

    return Array.isArray(rows) ? rows : [];
  }

  async function getCartProductTitles() {
    const rows = await getCartRows();
    return rows.map(x => x.title).filter(Boolean);
  }

  async function removeProductByName(productName) {
    await goToCartDirect();

    const target = normalizeText(productName);

    const result = await I.executeScript((targetText) => {
      const normalize = (s) =>
        String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const rowSelectors = [
        '[class*="pb-basket-item"]',
        '[class*="basket-item"]',
        '[class*="BasketItem"]',
        'li'
      ];

      const titleSelectors = [
        '[data-testid="product-name"]',
        '[class*="product-name"]',
        '[class*="prdct-desc-cntnr-name"]',
        '.pb-basket-item-text',
        '.basket-product-name',
        'a[href*="/p-"]'
      ];

      const removeSelectors = [
        '[data-testid*="remove"]',
        '[class*="remove"]',
        'button[class*="delete"]',
        'button[class*="remove"]',
        'i[class*="trash"]',
        'button'
      ];

      const scoreMatch = (candidate, target) => {
        const a = normalize(candidate);
        const b = normalize(target);
        if (!a || !b) return 0;

        if (a === b) return 1000;
        if (a.includes(b)) return 900;
        if (b.includes(a)) return 700;

        const tokens = b.split(" ").filter(x => x.length >= 3);
        let score = 0;
        for (const token of tokens) {
          if (a.includes(token)) score += 10;
        }
        return score;
      };

      const rows = [];
      for (const rowSel of rowSelectors) {
        for (const row of Array.from(document.querySelectorAll(rowSel))) {
          let title = "";
          for (const titleSel of titleSelectors) {
            const el = row.querySelector(titleSel);
            if (el) {
              const t = normalize(el.innerText || el.textContent || "");
              if (t) {
                title = t;
                break;
              }
            }
          }

          const rowText = normalize(row.innerText || row.textContent || "");
          if (!title && !rowText) continue;

          const titleScore = scoreMatch(title, targetText);
          const rowScore = scoreMatch(rowText, targetText);
          const bestScore = Math.max(titleScore * 2, rowScore);

          rows.push({
            row,
            title,
            rowText,
            score: bestScore
          });
        }
      }

      rows.sort((a, b) => b.score - a.score);
      const best = rows[0];

      if (!best || best.score < 20) {
        return {
          ok: false,
          mode: "not-found",
          targetText,
          bestScore: best ? best.score : 0
        };
      }

      for (const removeSelector of removeSelectors) {
        const buttons = Array.from(best.row.querySelectorAll(removeSelector));
        for (const btn of buttons) {
          const btnText = normalize(btn.innerText || btn.textContent || "");
          const cls = normalize(btn.className || "");
          const aria = normalize(btn.getAttribute && btn.getAttribute("aria-label"));
          const title = normalize(btn.getAttribute && btn.getAttribute("title"));

          const looksLikeRemove =
            btnText.includes("sil") ||
            btnText.includes("remove") ||
            cls.includes("remove") ||
            cls.includes("delete") ||
            cls.includes("trash") ||
            aria.includes("sil") ||
            aria.includes("remove") ||
            title.includes("sil") ||
            title.includes("remove");

          if (!looksLikeRemove && removeSelector === "button") continue;

          try {
            btn.scrollIntoView({ block: "center", inline: "center" });
            btn.click();
            return {
              ok: true,
              mode: "best-score-match",
              targetText,
              bestScore: best.score,
              matchedTitle: best.title,
              matchedRowText: best.rowText.slice(0, 300)
            };
          } catch (_) {}
        }
      }

      return {
        ok: false,
        mode: "remove-button-not-found",
        targetText,
        bestScore: best.score,
        matchedTitle: best.title,
        matchedRowText: best.rowText.slice(0, 300)
      };
    }, target);

    await I.wait(2);
    return result;
  }

  const fifoQueue = [];
  let stepNo = 1;

  for (const product of products) {
    const productName = product.name || product.url;
    const productUrl = product.url;

    I.say(`PROCESS PRODUCT: ${productName}`);

    await ProductPage.open(productUrl);
    await ProductPage.prepare();

    const productPageUrl = await I.grabCurrentUrl();
    await I.saveScreenshot(`${pad(stepNo)}_product_page.png`);
    writeStepNote(`${pad(stepNo)}_product_page`, [
      "step: product_page",
      `product_name: ${productName}`,
      `product_url: ${productUrl}`,
      `opened_url: ${productPageUrl}`,
      `time: ${new Date().toISOString()}`
    ]);
    stepNo++;

    await ProductPage.addToCart();

    let miniCartUrl = "-";
    try {
      miniCartUrl = await I.grabCurrentUrl();
    } catch (_) {}

    let miniCartBody = "";
    try {
      miniCartBody = await I.grabTextFrom("body");
    } catch (_) {}

    await I.saveScreenshot(`${pad(stepNo)}_mini_cart_after_add.png`);
    writeStepNote(`${pad(stepNo)}_mini_cart_after_add`, [
      "step: mini_cart_after_add",
      `product_name: ${productName}`,
      `product_url: ${productUrl}`,
      `current_url: ${miniCartUrl}`,
      `body_excerpt: ${miniCartBody.replace(/\s+/g, " ").slice(0, 500)}`,
      `time: ${new Date().toISOString()}`
    ]);
    stepNo++;

    fifoQueue.push(productName);

    await goToCartDirect();

    const cartUrlAfterAdd = await I.grabCurrentUrl();
    const cartTitlesAfterAdd = await getCartProductTitles();

    let cartBodyAfterAdd = "";
    try {
      cartBodyAfterAdd = await I.grabTextFrom("body");
    } catch (_) {}

    await I.saveScreenshot(`${pad(stepNo)}_basket_after_add.png`);
    writeStepNote(`${pad(stepNo)}_basket_after_add`, [
      "step: basket_after_add",
      `product_name: ${productName}`,
      `cart_url: ${cartUrlAfterAdd}`,
      `fifo_queue_now: ${JSON.stringify(fifoQueue)}`,
      `cart_titles_after_add: ${JSON.stringify(cartTitlesAfterAdd)}`,
      `body_excerpt: ${cartBodyAfterAdd.replace(/\s+/g, " ").slice(0, 700)}`,
      `time: ${new Date().toISOString()}`
    ]);
    stepNo++;

    if (fifoQueue.length > cartLimit) {
      const removedProduct = fifoQueue.shift();

      I.say(`REMOVE OLDEST PRODUCT: ${removedProduct}`);

      const removeResult = await removeProductByName(removedProduct);
      const cartTitlesAfterRemove = await getCartProductTitles();

      const cartUrlAfterRemove = await I.grabCurrentUrl();
      let cartBodyAfterRemove = "";
      try {
        cartBodyAfterRemove = await I.grabTextFrom("body");
      } catch (_) {}

      await I.saveScreenshot(`${pad(stepNo)}_basket_after_remove_oldest.png`);
      writeStepNote(`${pad(stepNo)}_basket_after_remove_oldest`, [
        "step: basket_after_remove_oldest",
        `last_added_product: ${productName}`,
        `removed_oldest_product_expected: ${removedProduct}`,
        `removed_match_info: ${JSON.stringify(removeResult)}`,
        `cart_limit: ${cartLimit}`,
        `fifo_queue_after_remove: ${JSON.stringify(fifoQueue)}`,
        `cart_titles_after_remove: ${JSON.stringify(cartTitlesAfterRemove)}`,
        `cart_url: ${cartUrlAfterRemove}`,
        `body_excerpt: ${cartBodyAfterRemove.replace(/\s+/g, " ").slice(0, 700)}`,
        `time: ${new Date().toISOString()}`
      ]);
      stepNo++;
    }
  }
});
const fs = require("fs");
const path = require("path");
const {
  EvidenceManager,
  captureEvidenceStep,
  captureCartEvidence,
} = require("../helpers/evidence");

Feature("Trendyol - Multi Product FIFO Evidence Scenario");

function writeStepNote(name, lines) {
  fs.mkdirSync(path.join(process.cwd(), "output"), { recursive: true });
  const filePath = path.join(process.cwd(), "output", `${name}.txt`);
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
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("products.json is empty or invalid");
  }

  return parsed.map((p, i) => {
    if (!p || !p.url) {
      throw new Error(`products.json item ${i} is invalid`);
    }

    return {
      name: String(p.name || `Product ${i + 1}`),
      url: String(p.url),
    };
  });
}

Scenario("Add products one by one, keep only last 4 in cart, capture evidence on every page", async ({ I }) => {
  const products = loadProducts();
  const cartLimit = 4;
  const perProductLimit = 2;
  let stepNo = 1;
  const fifoQueue = [];
  const evidence = new EvidenceManager({
    baseDir: path.join(process.cwd(), "output", "demo-runs"),
    runLabel: "multi_product_fifo",
  });

  function nextShot(label) {
    return `${pad(stepNo++)}_${label}.png`;
  }

  function normalizeNameForMatch(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function removeBlockingUi() {
    const selectors = [
      '[data-testid="overlay"]',
      ".onboarding-tour__overlay",
      ".onboarding-tour",
      '[class*="overlay"]',
      '[class*="social-proof"]',
      '[class*="tooltip"]',
      '[class*="popover"]',
      '[class*="modal"]',
      '[class*="dropdown"]',
    ];

    for (const sel of selectors) {
      await I.executeScript((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      }, sel);
    }

    await I.executeScript(() => {
      const wanted = ["Kabul Et", "Tümünü Kabul Et", "Anladım", "Tamam", "Accept", "Close", "Kapat"];

      const isVisible = (el) => {
        if (!el || !el.getBoundingClientRect) return false;
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          st.display !== "none" &&
          st.visibility !== "hidden" &&
          st.opacity !== "0"
        );
      };

      const nodes = Array.from(document.querySelectorAll("button, a, div, span"));
      for (const el of nodes) {
        const txt = String(el.innerText || el.textContent || "").trim();
        if (!txt) continue;
        if (!wanted.some((x) => txt.includes(x))) continue;
        if (!isVisible(el)) continue;

        try {
          el.scrollIntoView({ block: "center", inline: "center" });
          el.click();
        } catch (_) {}
      }
    });

    await I.wait(1);
  }

  async function openProduct(url) {
    await I.say(`OPEN PRODUCT: ${url}`);
    await I.amOnPage(url);
    await I.wait(2);
    await removeBlockingUi();
  }

  async function goToCart() {
    await I.amOnPage("https://www.trendyol.com/sepetim");
    await I.wait(2);
    await removeBlockingUi();
  }

  async function clickAddToCart() {
    return await I.executeScript(() => {
      const normalize = (s) => String(s || "").replace(/\s+/g, " ").trim();

      const isVisible = (el) => {
        if (!el || !el.getBoundingClientRect) return false;
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          st.display !== "none" &&
          st.visibility !== "hidden" &&
          st.opacity !== "0"
        );
      };

      const selectors = [
        '[data-testid="add-to-cart-button"]',
        "button.add-to-basket",
        'button[class*="add-to-basket"]',
        'button[class*="addToBasket"]',
        "button",
        "a",
        "div",
        "span",
      ];

      for (const sel of selectors) {
        for (const el of Array.from(document.querySelectorAll(sel))) {
          const txt = normalize(el.innerText || el.textContent || "");
          if (!txt) continue;
          if (!/sepete ekle|add to cart/i.test(txt)) continue;
          if (!isVisible(el)) continue;

          try {
            el.scrollIntoView({ block: "center", inline: "center" });
            el.click();
            return { ok: true, selector: sel, text: txt.slice(0, 200) };
          } catch (_) {}
        }
      }

      return { ok: false, mode: "add-button-not-found" };
    });
  }

  async function getCartSnapshot() {
    await goToCart();

    return await I.executeScript(() => {
      const normalize = (s) => String(s || "").replace(/\s+/g, " ").trim();
      const fold = (s) =>
        String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const isVisible = (el) => {
        if (!el || !el.getBoundingClientRect) return false;
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          st.display !== "none" &&
          st.visibility !== "hidden" &&
          st.opacity !== "0"
        );
      };

      const bodyText = normalize(document.body ? document.body.innerText : "");

      let cartCount = null;
      for (const re of [
        /Sepetim\s*\((\d+)\s*Ürün\)/i,
        /Sepetim\s*\((\d+)\s*Urun\)/i,
        /(\d+)\s*Ürün/i,
        /(\d+)\s*Urun/i,
      ]) {
        const m = bodyText.match(re);
        if (m) {
          cartCount = Number(m[1]);
          break;
        }
      }

      const removeButtons = Array.from(document.querySelectorAll("button, a, div, span")).filter((el) => {
        const txt = normalize(el.innerText || el.textContent || "");
        return /^(sil|remove|delete)$/i.test(txt) && isVisible(el);
      });

      const items = [];
      const titles = [];
      const seenItems = new Set();
      const seenTitles = new Set();

      for (const btn of removeButtons) {
        let node = btn;
        let bestContext = "";

        for (let depth = 0; depth < 10 && node; depth++) {
          node = node.parentElement;
          if (!node) break;

          const txt = normalize(node.innerText || node.textContent || "");
          if (!txt) continue;
          if (txt.length < 40 || txt.length > 1800) continue;

          bestContext = txt;
          if (/satıcı:|tahmini kargoya teslim|kargo|beden:|sil|adet/i.test(txt)) {
            break;
          }
        }

        if (!bestContext) continue;

        const itemKey = bestContext.slice(0, 300);
        if (!seenItems.has(itemKey)) {
          seenItems.add(itemKey);
          items.push({ context: bestContext.slice(0, 900) });
        }

        const lines = bestContext
          .split(/\n+/)
          .map((x) => normalize(x))
          .filter(Boolean);

        let chosen = "";
        for (const line of lines) {
          const f = fold(line);

          if (line.length < 4 || line.length > 260) continue;
          if (seenTitles.has(f)) continue;
          if (/^sil$|^remove$|^delete$/i.test(line)) continue;
          if (/^satıcı:/i.test(line)) continue;
          if (/^tahmini kargoya teslim/i.test(line)) continue;
          if (/^beden:/i.test(line)) continue;
          if (/^\d+([.,]\d+)?\s*tl$/i.test(line)) continue;
          if (!/[a-zA-ZğüşöçıİĞÜŞÖÇ]/.test(line)) continue;

          chosen = line;
          break;
        }

        if (chosen) {
          seenTitles.add(fold(chosen));
          titles.push(chosen);
        }
      }

      return {
        cartCount,
        items,
        titles,
        bodyExcerpt: bodyText.slice(0, 1800),
      };
    });
  }

  async function getProductCountInCart(targetName) {
    const cart = await getCartSnapshot();
    const target = normalizeNameForMatch(targetName);

    let count = 0;
    for (const title of cart.titles || []) {
      const candidate = normalizeNameForMatch(title);
      if (candidate.includes(target) || target.includes(candidate)) {
        count += 1;
      }
    }

    return { count, cart };
  }

  async function removeProductByName(wantedName) {
    await goToCart();

    const result = await I.executeScript((targetText) => {
      const normalize = (s) =>
        String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const isVisible = (el) => {
        if (!el || !el.getBoundingClientRect) return false;
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          st.display !== "none" &&
          st.visibility !== "hidden" &&
          st.opacity !== "0"
        );
      };

      const scoreMatch = (candidate, target) => {
        const a = normalize(candidate);
        const b = normalize(target);

        if (!a || !b) return 0;
        if (a === b) return 1000;
        if (a.includes(b)) return 900;
        if (b.includes(a)) return 700;

        const aTokens = a.split(" ").filter((x) => x.length >= 3);
        const bTokens = b.split(" ").filter((x) => x.length >= 3);

        let hit = 0;
        for (const token of bTokens) {
          if (a.includes(token)) hit++;
        }

        let reverseHit = 0;
        for (const token of aTokens) {
          if (b.includes(token)) reverseHit++;
        }

        let score = hit * 25 + reverseHit * 5;
        if (hit >= Math.max(2, Math.ceil(bTokens.length * 0.5))) score += 150;

        for (const brand of ["hadron", "sebir", "chuba", "uniprom", "baran"]) {
          if (a.includes(brand) && b.includes(brand)) score += 50;
        }

        for (const word of ["ps3", "kablo", "atki", "atkı", "hirka", "hırka", "diz", "koruma"]) {
          if (a.includes(word) && b.includes(word)) score += 30;
        }

        return score;
      };

      const removeButtons = Array.from(document.querySelectorAll("button, a, div, span")).filter((el) => {
        const txt = normalize(el.innerText || el.textContent || "");
        return /^(sil|remove|delete)$/i.test(txt) && isVisible(el);
      });

      const candidates = [];

      for (const btn of removeButtons) {
        let node = btn;

        for (let depth = 0; depth < 6 && node; depth++) {
          node = node.parentElement;
          if (!node) break;

          const raw = String(node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
          const txt = normalize(raw);

          if (!txt) continue;
          if (txt.length < 20 || txt.length > 500) continue;

          const silCount = (txt.match(/\bsil\b/g) || []).length;
          const saticiCount = (txt.match(/satıcı:/g) || []).length;
          const teslimCount = (txt.match(/tahmini kargoya teslim/g) || []).length;

          const rawScore = scoreMatch(txt, targetText);
          let score = rawScore;

          if (silCount !== 1) score -= 200;
          if (saticiCount > 1) score -= 120;
          if (teslimCount > 1) score -= 120;
          if (txt.length > 260) score -= 40;

          candidates.push({
            btn,
            score,
            rawScore,
            context: raw,
            depth,
            silCount,
            saticiCount,
            teslimCount,
          });
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];

      if (!best || best.score < 80) {
        return {
          ok: false,
          mode: "not-found",
          targetText,
          bestScore: best ? best.score : 0,
          checkedButtons: candidates.length,
        };
      }

      try {
        best.btn.scrollIntoView({ block: "center", inline: "center" });
        best.btn.click();
      } catch (_) {
        try {
          best.btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        } catch (_) {}
      }

      return {
        ok: true,
        mode: "single-row-remove-match",
        targetText,
        bestScore: best.score,
        rawScore: best.rawScore,
        matchedContext: String(best.context || "").slice(0, 400),
        checkedButtons: candidates.length,
        depth: best.depth,
        silCount: best.silCount,
        saticiCount: best.saticiCount,
        teslimCount: best.teslimCount,
      };
    }, wantedName);

    await I.wait(2);
    await goToCart();

    return result;
  }

  for (const product of products) {
    await I.say(`PROCESS PRODUCT: ${product.name}`);
    await openProduct(product.url);

    await captureEvidenceStep({
      I,
      manager: evidence,
      stepName: "product_page",
      meta: {
        productName: product.name,
        productUrl: product.url,
      },
    });

    const productUrl = await I.grabCurrentUrl();
    await I.saveScreenshot(nextShot("product_page"));

    const existingCountBeforeAttempt = fifoQueue.filter(
      (name) => normalizeNameForMatch(name) === normalizeNameForMatch(product.name)
    ).length;

    await openProduct(product.url);

    let addResult;
    let addStatus = "added";
    let limitBadge = "green";

    if (existingCountBeforeAttempt >= perProductLimit) {
      addStatus = "blocked_by_product_limit";
      limitBadge = "amber";
      addResult = {
        ok: false,
        mode: "blocked_by_product_limit",
        productName: product.name,
        existingCountBeforeAttempt,
        perProductLimit,
      };
      await I.say(
        `PRODUCT LIMIT BLOCKED: ${product.name} (${existingCountBeforeAttempt}/${perProductLimit})`
      );
    } else {
      addResult = await clickAddToCart();
      if (!addResult || !addResult.ok) {
        addStatus = "failed";
        limitBadge = "red";
      }
    }

    await I.wait(2);

    const currentUrlAfterAdd = await I.grabCurrentUrl();
    const productBody = await I.grabTextFrom("body");
    await I.saveScreenshot(nextShot("mini_cart_after_add"));

    writeStepNote(`${pad(stepNo - 1)}_mini_cart_after_add`, [
      "step: mini_cart_after_add",
      `product_name: ${product.name}`,
      `product_url: ${product.url}`,
      `current_url: ${currentUrlAfterAdd}`,
      `add_status: ${addStatus}`,
      `limit_badge: ${limitBadge}`,
      `existing_count_before_attempt: ${existingCountBeforeAttempt}`,
      `product_limit: ${perProductLimit}`,
      `add_result: ${JSON.stringify(addResult)}`,
      `body_excerpt: ${String(productBody || "").replace(/\s+/g, " ").slice(0, 1000)}`,
      `time: ${new Date().toISOString()}`,
    ]);

    if (addStatus === "added") {
      fifoQueue.push(product.name);
    }

    const cartAfterAdd = await getCartSnapshot();
    const cartUrlAfterAdd = await I.grabCurrentUrl();
    await I.saveScreenshot(nextShot("basket_after_add"));

    writeStepNote(`${pad(stepNo - 1)}_basket_after_add`, [
      "step: basket_after_add",
      `product_name: ${product.name}`,
      `cart_url: ${cartUrlAfterAdd}`,
      `add_status: ${addStatus}`,
      `limit_badge: ${limitBadge}`,
      `existing_count_before_attempt: ${existingCountBeforeAttempt}`,
      `product_limit: ${perProductLimit}`,
      `fifo_queue_now: ${JSON.stringify(fifoQueue)}`,
      `cart_count_after_add: ${cartAfterAdd.cartCount}`,
      `cart_titles_after_add: ${JSON.stringify(cartAfterAdd.titles)}`,
      `cart_items_after_add: ${JSON.stringify(cartAfterAdd.items)}`,
      `body_excerpt: ${cartAfterAdd.bodyExcerpt}`,
      `time: ${new Date().toISOString()}`,
    ]);

    await captureCartEvidence({
      I,
      manager: evidence,
      stepName: "cart_after_add",
      cartSnapshot: cartAfterAdd,
      extra: {
        productName: product.name,
        productUrl,
        cartUrl: cartUrlAfterAdd,
        action: "after_add",
        addResult,
        addStatus,
        limitBadge,
        existingCountBeforeAttempt,
        perProductLimit,
        fifoQueue: [...fifoQueue],
      },
    });

    if (fifoQueue.length > cartLimit) {
      const oldest = fifoQueue.shift();

      await I.say(`REMOVE OLDEST PRODUCT: ${oldest}`);

      await captureCartEvidence({
        I,
        manager: evidence,
        stepName: "before_remove_oldest",
        cartSnapshot: cartAfterAdd,
        extra: {
          currentProduct: product.name,
          oldestExpected: oldest,
          action: "before_remove_oldest",
          fifoQueueBeforeRemove: [oldest, ...fifoQueue],
        },
      });

      const removeResult = await removeProductByName(oldest);

      const cartAfterRemove = await getCartSnapshot();
      const cartUrlAfterRemove = await I.grabCurrentUrl();
      await I.saveScreenshot(nextShot("basket_after_remove_oldest"));

      writeStepNote(`${pad(stepNo - 1)}_basket_after_remove_oldest`, [
        "step: basket_after_remove_oldest",
        `last_added_product: ${product.name}`,
        `removed_oldest_product_expected: ${oldest}`,
        `removed_match_info: ${JSON.stringify(removeResult)}`,
        `cart_limit: ${cartLimit}`,
        `fifo_queue_after_remove: ${JSON.stringify(fifoQueue)}`,
        `cart_count_after_remove: ${cartAfterRemove.cartCount}`,
        `cart_titles_after_remove: ${JSON.stringify(cartAfterRemove.titles)}`,
        `cart_items_after_remove: ${JSON.stringify(cartAfterRemove.items)}`,
        `cart_url: ${cartUrlAfterRemove}`,
        `body_excerpt: ${cartAfterRemove.bodyExcerpt}`,
        `time: ${new Date().toISOString()}`,
      ]);

      await captureCartEvidence({
        I,
        manager: evidence,
        stepName: "after_remove_oldest",
        cartSnapshot: cartAfterRemove,
        extra: {
          currentProduct: product.name,
          removedExpected: oldest,
          action: "after_remove_oldest",
          cartLimit,
          removeResult,
          fifoQueueAfterRemove: [...fifoQueue],
          cartUrl: cartUrlAfterRemove,
        },
      });
    }
  }

  evidence.finalize({
    status: "success",
    finalQueue: [...fifoQueue],
    processedProducts: products.map((p) => p.name),
    totalProductsProcessed: products.length,
    finalCartLimit: cartLimit,
    perProductLimit,
    finishedAt: new Date().toISOString(),
  });
});

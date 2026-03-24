const fs = require("fs");
const path = require("path");
const { I } = inject();
const {
  isBadPage,
  safeScreenshot,
  acceptCookieLikePopups,
  clickByHints,
  verifyAddToCart,
  verifyRemoveFromCart,
} = require("../helpers/trendyol_shared");

Feature("Trendyol - Add Remove Per URL");

const dataset = process.env.DATASET || "datasets/pdp_verified.txt";
const outputDir = path.join(process.cwd(), "output");
const reportFile = path.join(outputDir, "add_remove_per_url.jsonl");

function extractProductId(url) {
  const m = String(url || "").match(/-p-(\d+)/i);
  return m ? m[1] : "unknown";
}

function appendJsonLine(file, row) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(row) + "\n", "utf8");
}

function readDataset(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Dataset not found: ${file}`);
  }

  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);
}

function compactText(value, max = 180) {
  const s = String(value || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}...` : s;
}

fs.mkdirSync(outputDir, { recursive: true });
if (fs.existsSync(reportFile)) fs.unlinkSync(reportFile);

const urls = readDataset(dataset);

urls.forEach((url, i) => {
  const idx = i + 1;

  Scenario(`Add Remove [${idx}/${urls.length}]`, async () => {
    const productId = extractProductId(url);

    const row = {
      index: idx,
      url,
      productId,
      finalUrl: "",
      title: "",
      isProductPage: false,
      addClicked: null,
      addVerified: false,
      cartOpened: false,
      removeClicked: null,
      removeVerified: false,
      flowOk: false,
      screenshots: {},
      reason: null,
    };

    I.say(`OPEN [${idx}/${urls.length}] ${url}`);

    await I.amOnPage(url);
    I.wait(2);
    await acceptCookieLikePopups(I);

    row.finalUrl = await I.grabCurrentUrl().catch(() => "");
    row.title = await I.grabTitle().catch(() => "");
    row.isProductPage = !isBadPage(row.finalUrl, row.title);

    row.screenshots.pdp = `perurl_${String(idx).padStart(2, "0")}_${productId}_pdp.png`;
    await safeScreenshot(I, row.screenshots.pdp);

    if (!row.isProductPage) {
      row.reason = "not_product_page";
      appendJsonLine(reportFile, row);
      return;
    }

    const addClickedText = await clickByHints(
      I,
      ["sepete ekle", "add to cart", "add to basket"],
      {
        selectors: "button,a,div,span",
        minWidth: 10,
        minHeight: 10,
        scrollIntoView: true,
      }
    );

    row.addClicked = compactText(addClickedText);

    row.screenshots.afterAdd = `perurl_${String(idx).padStart(2, "0")}_${productId}_after_add.png`;
    await safeScreenshot(I, row.screenshots.afterAdd);

    if (!addClickedText) {
      row.reason = "add_to_cart_not_found";
      appendJsonLine(reportFile, row);
      return;
    }

    I.wait(2);

    const addSignals = await verifyAddToCart(I);
    row.addVerified = !!(addSignals.hasAddedText || addSignals.hasBasketCount);

    const cartClickedText = await clickByHints(
      I,
      ["sepetim", "sepete git", "sepet", "go to cart"],
      {
        selectors: "button,a,div,span",
        minWidth: 8,
        minHeight: 8,
        scrollIntoView: true,
      }
    );

    I.wait(2);

    let cartUrl = await I.grabCurrentUrl().catch(() => "");
    if (!cartUrl.includes("sepet")) {
      await I.amOnPage("/sepetim");
      I.wait(2);
      cartUrl = await I.grabCurrentUrl().catch(() => "");
    }

    row.cartOpened = cartUrl.includes("sepet");
    row.screenshots.cart = `perurl_${String(idx).padStart(2, "0")}_${productId}_cart.png`;
    await safeScreenshot(I, row.screenshots.cart);

    const removeClickedText = await clickByHints(
      I,
      ["sil", "kaldır", "çıkar", "remove", "delete"],
      {
        selectors: "button,a,div,span",
        minWidth: 8,
        minHeight: 8,
        scrollIntoView: true,
      }
    );

    row.removeClicked = compactText(removeClickedText);

    if (!removeClickedText) {
      row.reason = "remove_not_found";
      appendJsonLine(reportFile, row);
      return;
    }

    I.wait(2);

    const removeSignals = await verifyRemoveFromCart(I);
    row.removeVerified = !!(
      removeSignals.stillOnCartPage &&
      (removeSignals.emptyLike || removeSignals.visibleItemCount === 0)
    );

    row.screenshots.afterRemove = `perurl_${String(idx).padStart(2, "0")}_${productId}_after_remove.png`;
    await safeScreenshot(I, row.screenshots.afterRemove);

    row.flowOk = !!(row.isProductPage && row.addVerified && row.cartOpened && row.removeVerified);

    if (!row.flowOk && !row.reason) {
      row.reason = "flow_not_verified";
    }

    appendJsonLine(reportFile, row);

    I.say(`FINAL=${row.finalUrl}`);
    I.say(`ADD_OK=${row.addVerified}`);
    I.say(`CART_OK=${row.cartOpened}`);
    I.say(`REMOVE_OK=${row.removeVerified}`);
    I.say(`FLOW_OK=${row.flowOk}`);
  });
});

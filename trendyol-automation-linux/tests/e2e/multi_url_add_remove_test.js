const fs = require("fs");
const path = require("path");
const { I } = inject();
const {
  shortenText,
  isBadPage,
  safeScreenshot,
  acceptCookieLikePopups,
  clickByHints,
  verifyAddToCart,
  verifyRemoveFromCart,
} = require("../helpers/trendyol_shared");

Feature("Trendyol - Multi URL Enterprise Demo (POM)");

Scenario("Products list -> open -> add-to-cart -> cart -> remove -> summary (POM)", async () => {
  const dataset = process.env.DATASET || "datasets/basic.txt";
  const outputDir = path.join(process.cwd(), "output");
  const reportFile = path.join(outputDir, "case_report.multi.json");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const events = [];
  const startedAt = new Date().toISOString();

  function add(event, data = {}) {
    events.push({
      ts: new Date().toISOString(),
      event,
      ...data,
    });
  }

  function compactText(value, max = 180) {
    const s = String(value || "").replace(/\s+/g, " ").trim();
    return s.length > max ? `${s.slice(0, max)}...` : s;
  }

function buildSummary(urls, events, startedAt, finishedAt, dataset) {
    const addOk = events.filter((e) => e.event === "cart:add_verified" && e.verified).length;
    const cartOpenOk = events.filter(
      (e) => e.event === "cart:open_verified" && e.verified
    ).length;
    const removeOk = events.filter(
      (e) => e.event === "cart:remove_verified" && e.verified
    ).length;

    return {
      startedAt,
      finishedAt,
      dataset,
      totals: {
        urls: urls.length,
        opened: events.filter((e) => e.event === "url:open").length,
        ok: events.filter((e) => e.event === "url:ok").length,
        skipped: events.filter((e) => e.event === "url:skip").length,
        addOk,
        cartOpenOk,
        removeOk,
        flowOk: addOk && cartOpenOk && removeOk ? 1 : 0,
      },
      events,
    };
  }

  I.say(`DATASET=${dataset}`);
  add("run:start", { dataset });

  if (!fs.existsSync(dataset)) {
    add("run:error", { reason: "dataset_not_found", dataset });
    fs.writeFileSync(
      reportFile,
      JSON.stringify(
        { startedAt, finishedAt: new Date().toISOString(), dataset, events },
        null,
        2
      ),
      "utf8"
    );
    throw new Error(`Dataset not found: ${dataset}`);
  }

  const urls = fs
    .readFileSync(dataset, "utf8")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  I.say(`URL count=${urls.length}`);
  add("run:urls", { count: urls.length });

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const idx = i + 1;

    I.say(`OPEN [${idx}/${urls.length}] ${url}`);
    add("url:open", { idx, total: urls.length, url });

    await I.amOnPage(url);
    I.wait(2);

    await acceptCookieLikePopups(I);

    const current = await I.grabCurrentUrl().catch(() => "");
    const title = await I.grabTitle().catch(() => "");

    I.say(`CURRENT=${current}`);
    I.say(`TITLE=${title}`);

    if (isBadPage(current, title)) {
      I.say(`SKIP: not product page -> ${current}`);
      add("url:skip", {
        idx,
        total: urls.length,
        url,
        current,
        title,
        reason: "not_product_page",
      });
      continue;
    }

    add("url:ok", {
      idx,
      total: urls.length,
      url,
      current,
      title,
    });

    await safeScreenshot(I, `pdp_${idx}.png`);

    const addClickedText = await clickByHints(I, 
      ["sepete ekle", "add to cart", "add to basket"],
      {
        selectors: "button,a,div,span",
        minWidth: 10,
        minHeight: 10,
        scrollIntoView: true,
      }
    );

    if (!addClickedText) {
      I.say("SKIP: add-to-cart not found");
      add("cart:add:skip", {
        idx,
        total: urls.length,
        url,
        current,
        reason: "add_to_cart_not_found",
      });
      continue;
    }

    I.wait(2);

    const addSignals = await verifyAddToCart(I);
    const addVerified = !!(addSignals.hasAddedText || addSignals.hasBasketCount);

    I.say(`[add-to-cart] clicked: ${addClickedText}`);
    add("cart:add_verified", {
      idx,
      total: urls.length,
      url,
      current: addSignals.url || current,
      clickedLabel: compactText(addClickedText),
      verified: addVerified,
      signals: addSignals,
    });

    const cartClickedText = await clickByHints(I, 
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
    let cartOpenVerified = false;

    if (cartUrl.includes("sepet")) {
      cartOpenVerified = true;
    } else {
      await I.amOnPage("/sepetim");
      I.wait(2);
      cartUrl = await I.grabCurrentUrl().catch(() => "");
      cartOpenVerified = cartUrl.includes("sepet");
    }

    add("cart:open_verified", {
      idx,
      total: urls.length,
      url,
      cartUrl,
      clickedLabel: compactText(cartClickedText),
      verified: cartOpenVerified,
    });

    await safeScreenshot(I, `cart_${idx}.png`);

    const removeClickedText = await clickByHints(I, 
      ["sil", "kaldır", "çıkar", "remove", "delete"],
      {
        selectors: "button,a,div,span",
        minWidth: 8,
        minHeight: 8,
        scrollIntoView: true,
      }
    );

    if (!removeClickedText) {
      add("cart:remove:skip", {
        idx,
        total: urls.length,
        url,
        cartUrl,
        reason: "remove_not_found",
      });
      I.wait(1);
      continue;
    }

    I.wait(2);

    const removeSignals = await verifyRemoveFromCart(I);
    const removeVerified = !!(
      removeSignals.stillOnCartPage &&
      (removeSignals.emptyLike || removeSignals.visibleItemCount === 0)
    );

    add("cart:remove_verified", {
      idx,
      total: urls.length,
      url,
      cartUrl,
      clickedLabel: compactText(removeClickedText),
      verified: removeVerified,
      signals: removeSignals,
    });

    await safeScreenshot(I, `after_remove_${idx}.png`);
  }

  const summary = buildSummary(
    urls,
    events,
    startedAt,
    new Date().toISOString(),
    dataset
  );

  fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2), "utf8");
  I.say(`WROTE=${reportFile}`);

  if (summary.totals.flowOk !== 1) {
    throw new Error(`Flow failed. totals=${JSON.stringify(summary.totals)}`);
  }
});
















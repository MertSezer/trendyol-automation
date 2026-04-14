const fs = require("fs");
const path = require("path");

const {
  acceptCookieLikePopups,
  clickByHints,
  verifyAddToCart,
  verifyRemoveFromCart,
  safeScreenshot,
  isBadPage,
  shortenText,
  classifyPage,
  sanitizeText
} = require("../helpers/trendyol_shared");

const outputDir = path.join(process.cwd(), "output");
const dataset = process.env.DATASET || "datasets/candidate_intermittent.txt";

function nowIso() {
  return new Date().toISOString();
}

function readDataset(filePath) {
  const raw = fs.readFileSync(path.resolve(filePath), "utf8");
  return raw
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith("#"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

Feature("Trendyol - Probe Then Run");

Scenario("Find first real PDP in same session and run basic cart flow", async ({ I }) => {
  const startedAt = nowIso();
  const urls = readDataset(dataset);
  const reportPath = path.join(outputDir, "probe_then_run_report.json");

  const events = [];
  const diagnostics = [];

  let selectedInfo = null;
  let selectedDiagnostic = null;

  let addOk = false;
  let cartOpenOk = false;
  let removeOk = false;

  events.push({
    ts: nowIso(),
    event: "run:start",
    dataset,
    count: urls.length
  });

  I.say(`DATASET=${dataset}`);
  I.say(`URL count=${urls.length}`);

  for (let idx = 0; idx < urls.length; idx += 1) {
    const url = urls[idx];
    const ordinal = idx + 1;

    events.push({
      ts: nowIso(),
      event: "url:probe",
      idx: ordinal,
      total: urls.length,
      url
    });

    I.say(`PROBE [${ordinal}/${urls.length}] ${url}`);
    I.amOnPage(url);
    I.wait(2);

    await acceptCookieLikePopups(I);

    const currentUrl = sanitizeText(await I.grabCurrentUrl());
    const title = sanitizeText(await I.grabTitle());

    I.say(`CURRENT=${currentUrl}`);
    I.say(`TITLE=${title}`);

    const classification = classifyPage(currentUrl, title);
    const badByLegacyRule = isBadPage(currentUrl, title);

    const diag = {
      idx: ordinal,
      total: urls.length,
      probeUrl: sanitizeText(url),
      finalUrl: sanitizeText(currentUrl),
      title,
      pageKind: classification.pageKind,
      isBadPage: classification.isBadPage || badByLegacyRule,
      skipReason:
        classification.isBadPage || badByLegacyRule
          ? (classification.reasons.join("|") || "classified_as_non_product")
          : null,
      selected: false,
      addToCartAttempted: false,
      addVerified: false,
      cartOpenAttempted: false,
      cartReached: false,
      removeAttempted: false,
      removeVerified: false
    };

    if (diag.isBadPage) {
      diagnostics.push(diag);

      events.push({
        ts: nowIso(),
        event: "url:skip",
        idx: ordinal,
        total: urls.length,
        url,
        current: sanitizeText(currentUrl),
        title: shortenText(sanitizeText(title), 160),
        pageKind: diag.pageKind,
        skipReason: diag.skipReason
      });

      continue;
    }

    diag.selected = true;
    diagnostics.push(diag);
    selectedDiagnostic = diag;

    selectedInfo = {
      idx: ordinal,
      total: urls.length,
      url,
      current: sanitizeText(currentUrl),
      title
    };

    events.push({
      ts: nowIso(),
      event: "url:selected",
      idx: ordinal,
      total: urls.length,
      url,
      current: sanitizeText(currentUrl),
      title: shortenText(sanitizeText(title), 160),
      pageKind: diag.pageKind
    });

    I.say(`SELECTED=${currentUrl}`);
    await safeScreenshot(I, "probe_then_run_pdp.png");
    break;
  }

  if (!selectedInfo || !selectedDiagnostic) {
    const summary = {
      startedAt,
      finishedAt: nowIso(),
      dataset,
      status: "skipped",
      selected: null,
      totals: {
        urls: urls.length,
        selected: 0,
        skipped: diagnostics.length,
        addOk: 0,
        cartOpenOk: 0,
        removeOk: 0,
        flowOk: 0
      },
      diagnostics,
      events
    };

    writeJson(reportPath, summary);
    I.say(`WROTE=${reportPath}`);
    return;
  }

  selectedDiagnostic.addToCartAttempted = true;

  const addResult = await clickByHints(I, [
    "sepete ekle",
    "add to cart",
    "add to basket"
  ]);

  I.wait(2);

  const addVerify = await verifyAddToCart(I);
  addOk = !!(addResult && addVerify && (addVerify.hasAddedText || addVerify.hasBasketCount));
  selectedDiagnostic.addVerified = addOk;

  events.push({
    ts: nowIso(),
    event: addOk ? "cart:add_verified" : "cart:add_failed",
    url: selectedInfo.url,
    current: selectedInfo.current,
    clickedLabel: addResult || null,
    verified: addOk,
    signals: addVerify || null
  });

  if (!addOk) {
    const summary = {
      startedAt,
      finishedAt: nowIso(),
      dataset,
      status: "failed",
      selected: selectedInfo,
      totals: {
        urls: urls.length,
        selected: 1,
        skipped: diagnostics.filter((d) => !d.selected).length,
        addOk: 0,
        cartOpenOk: 0,
        removeOk: 0,
        flowOk: 0
      },
      diagnostics,
      events
    };

    writeJson(reportPath, summary);
    I.say(`WROTE=${reportPath}`);
    return;
  }

  selectedDiagnostic.cartOpenAttempted = true;

  const cartClick = await clickByHints(I, [
    "sepetim",
    "sepete git",
    "sepet",
    "go to cart"
  ], {
    minWidth: 8,
    minHeight: 8
  });

  I.wait(2);

  const cartUrl = sanitizeText(await I.grabCurrentUrl());
  cartOpenOk = cartUrl.includes("sepet");
  selectedDiagnostic.cartReached = cartOpenOk;

  events.push({
    ts: nowIso(),
    event: cartOpenOk ? "cart:open_verified" : "cart:open_failed",
    url: selectedInfo.url,
    cartUrl,
    clickedLabel: cartClick || null,
    verified: cartOpenOk
  });

  if (cartOpenOk) {
    await safeScreenshot(I, "probe_then_run_cart.png");
  }

  if (!cartOpenOk) {
    const summary = {
      startedAt,
      finishedAt: nowIso(),
      dataset,
      status: "failed",
      selected: selectedInfo,
      totals: {
        urls: urls.length,
        selected: 1,
        skipped: diagnostics.filter((d) => !d.selected).length,
        addOk: addOk ? 1 : 0,
        cartOpenOk: 0,
        removeOk: 0,
        flowOk: 0
      },
      diagnostics,
      events
    };

    writeJson(reportPath, summary);
    I.say(`WROTE=${reportPath}`);
    return;
  }

  selectedDiagnostic.removeAttempted = true;

  const removeClick = await clickByHints(I, [
    "sil",
    "kaldır",
    "çıkar",
    "remove",
    "delete"
  ], {
    minWidth: 8,
    minHeight: 8
  });

  I.wait(2);

  const removeVerify = await verifyRemoveFromCart(I);
  removeOk = !!(removeClick && removeVerify && removeVerify.visibleItemCount === 0);
  selectedDiagnostic.removeVerified = removeOk;

  events.push({
    ts: nowIso(),
    event: removeOk ? "cart:remove_verified" : "cart:remove_failed",
    url: selectedInfo.url,
    cartUrl: removeVerify?.url || null,
    clickedLabel: removeClick || null,
    verified: removeOk,
    signals: removeVerify || null
  });

  await safeScreenshot(I, "probe_then_run_after_remove.png");

  const flowOk = addOk && cartOpenOk && removeOk;

  const summary = {
    startedAt,
    finishedAt: nowIso(),
    dataset,
    status: flowOk ? "passed" : "failed",
    selected: selectedInfo,
    totals: {
      urls: urls.length,
      selected: 1,
      skipped: diagnostics.filter((d) => !d.selected).length,
      addOk: addOk ? 1 : 0,
      cartOpenOk: cartOpenOk ? 1 : 0,
      removeOk: removeOk ? 1 : 0,
      flowOk: flowOk ? 1 : 0
    },
    diagnostics,
    events
  };

  writeJson(reportPath, summary);
  I.say(`WROTE=${reportPath}`);
});


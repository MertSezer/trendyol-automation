const fs = require("fs");
const path = require("path");
const { I } = inject();
const {
  isBadPage,
  safeScreenshot,
  acceptCookieLikePopups,
} = require("../helpers/trendyol_shared");

Feature("Trendyol - PDP Single Session Probe");

const dataset = process.env.DATASET || "datasets/all_urls_noquery.txt";
const outputDir = path.join(process.cwd(), "output");
const resultsFile = path.join(outputDir, "pdp_probe_results.jsonl");

function extractProductId(url) {
  const match = String(url || "").match(/-p-(\d+)/i);
  return match ? match[1] : "unknown";
}

function makeShotName(idx, url) {
  const productId = extractProductId(url);
  const padded = String(idx).padStart(2, "0");
  return `probe_${padded}_${productId}.png`;
}

function detectPageType(finalUrl, title) {
  const url = String(finalUrl || "");
  const t = String(title || "");

  if (/-p-\d+/i.test(url)) return "product";

  if (
    url.includes("/sr?") ||
    url.includes("/sirali-urunler") ||
    url.includes("/cok-satanlar") ||
    url.includes("butik/liste") ||
    url.includes("-x-b") ||
    t.includes("Fiyatları") ||
    t.includes("Modelleri") ||
    t.includes("Arama Sonuçları")
  ) {
    return "listing";
  }

  return "unknown";
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
    .map((x) => x.trim())
    .filter(Boolean);
}

fs.mkdirSync(outputDir, { recursive: true });

if (fs.existsSync(resultsFile)) {
  fs.unlinkSync(resultsFile);
}

const urls = readDataset(dataset);

urls.forEach((url, i) => {
  const idx = i + 1;

  Scenario(`Probe PDP [${idx}/${urls.length}]`, async () => {
    const row = {
      index: idx,
      originalUrl: url,
      finalUrl: "",
      title: "",
      redirected: false,
      pageType: "unknown",
      isProductPage: false,
      screenshot: null,
      reason: null,
    };

    I.say(`OPEN [${idx}/${urls.length}] ${url}`);

    await I.amOnPage(url);
    I.wait(2);
    await acceptCookieLikePopups(I);

    const current = await I.grabCurrentUrl().catch(() => "");
    const title = await I.grabTitle().catch(() => "");

    row.finalUrl = current;
    row.title = title;
    row.redirected = current && current !== url;
    row.pageType = detectPageType(current, title);
    row.isProductPage = !isBadPage(current, title) && row.pageType === "product";
    row.reason = row.isProductPage ? null : "not_product_page";

    const shot = makeShotName(idx, current || url);
    await safeScreenshot(I, shot);
    row.screenshot = path.join("output", shot);

    appendJsonLine(resultsFile, row);

    I.say(`FINAL=${row.finalUrl}`);
    I.say(`TITLE=${row.title}`);
    I.say(`PAGE_TYPE=${row.pageType}`);
    I.say(`IS_PRODUCT=${row.isProductPage}`);
  });
});

const fs = require("fs");
const path = require("path");
const { I } = inject();

Feature("Trendyol - PDP Probe");

Scenario("Probe dataset URLs for real product-page availability", async () => {
  const dataset = process.env.DATASET || "datasets/basic.txt";
  const outputDir = path.join(process.cwd(), "output");
  const reportFile = path.join(outputDir, "pdp_probe_report.json");

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

  if (!fs.existsSync(dataset)) {
    throw new Error(`Dataset not found: ${dataset}`);
  }

  const urls = fs
    .readFileSync(dataset, "utf8")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  I.say(`DATASET=${dataset}`);
  I.say(`URL count=${urls.length}`);
  add("run:start", { dataset, count: urls.length });

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const idx = i + 1;

    I.say(`PROBE [${idx}/${urls.length}] ${url}`);
    add("url:probe", { idx, total: urls.length, url });

    await I.amOnPage(url);
    I.wait(2);

    await I.executeScript(() => {
      const nodes = Array.from(document.querySelectorAll("button,a,div,span"));
      const hints = ["kabul", "accept", "agree", "tamam", "ok", "kapat"];
      for (const el of nodes) {
        const txt = (el.innerText || "").toLowerCase();
        if (!txt) continue;
        if (hints.some(h => txt.includes(h))) {
          try { el.click(); } catch {}
        }
      }
    }).catch(() => {});

    const current = await I.grabCurrentUrl().catch(() => "");
    const title = await I.grabTitle().catch(() => "");

    const isProductUrl = current.includes("-p-");
    const isListingLike =
      current.includes("/sr?") ||
      current.includes("/sirali-urunler") ||
      current.includes("/cok-satanlar") ||
      current.includes("butik/liste");

    const isGenericTitle =
      (title || "").includes("Online Alışveriş Sitesi") ||
      (title || "").includes("Türkiye’nin Trend Yolu") ||
      (title || "").includes("Arama Sonuçları");

    const pdpOk = isProductUrl && !isListingLike && !isGenericTitle;

    I.say(`CURRENT=${current}`);
    I.say(`TITLE=${title}`);
    I.say(`PDP_OK=${pdpOk}`);

    add(pdpOk ? "url:pdp_ok" : "url:pdp_skip", {
      idx,
      total: urls.length,
      url,
      current,
      title,
      reason: pdpOk ? "ok" : "not_product_page",
    });
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    startedAt,
    finishedAt,
    dataset,
    totals: {
      urls: urls.length,
      pdpOk: events.filter(e => e.event === "url:pdp_ok").length,
      skipped: events.filter(e => e.event === "url:pdp_skip").length,
    },
    events,
  };

  fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2), "utf8");
  I.say(`WROTE=${reportFile}`);
});

const fs = require("fs");
const path = require("path");
const { I } = inject();

Feature("Trendyol - Probe Then Run");

Scenario("Find first real PDP in same session and run basic cart flow", async () => {
  const dataset = process.env.DATASET || "datasets/all_candidates.txt";
  const outputDir = path.join(process.cwd(), "output");
  const reportFile = path.join(outputDir, "probe_then_run_report.json");

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

  function isBadPage(current, title) {
    const c = String(current || "");
    const t = String(title || "");

    const listingLike =
      !c.includes("-p-") ||
      c.includes("/sr?") ||
      c.includes("/sirali-urunler") ||
      c.includes("/cok-satanlar") ||
      c.includes("butik/liste");

    const genericTitle =
      t.includes("Online Alışveriş Sitesi") ||
      t.includes("Türkiye’nin Trend Yolu") ||
      t.includes("Arama Sonuçları");

    return listingLike || genericTitle;
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

  let selected = null;

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

    selected = { idx, total: urls.length, url, current, title };
    add("url:selected", selected);
    I.say(`SELECTED=${current}`);
    break;
  }

  if (!selected) {
    const finishedAt = new Date().toISOString();
    const summary = {
      startedAt,
      finishedAt,
      dataset,
      status: "all_skipped",
      totals: {
        urls: urls.length,
        selected: 0,
        skipped: events.filter(e => e.event === "url:skip").length,
      },
      events,
    };
    fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2), "utf8");
    I.say(`WROTE=${reportFile}`);
    return;
  }

  I.saveScreenshot("probe_then_run_pdp.png");

  const clicked = await I.executeScript(() => {
    const nodes = Array.from(document.querySelectorAll("button,a,div,span"));
    const hints = ["sepete ekle", "add to cart", "add to basket"];

    for (const el of nodes) {
      const txt = (el.innerText || "").toLowerCase();
      if (!txt) continue;
      if (!hints.some(h => txt.includes(h))) continue;

      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) continue;

      try {
        el.scrollIntoView({ block: "center" });
        el.click();
        return txt;
      } catch {}
    }

    return null;
  }).catch(() => null);

  if (!clicked) {
    add("cart:add:skip", {
      url: selected.url,
      current: selected.current,
      reason: "add_to_cart_not_found",
    });

    const finishedAt = new Date().toISOString();
    fs.writeFileSync(reportFile, JSON.stringify({
      startedAt,
      finishedAt,
      dataset,
      status: "selected_but_add_not_found",
      events,
    }, null, 2), "utf8");

    I.say(`WROTE=${reportFile}`);
    return;
  }

  add("cart:add", {
    url: selected.url,
    current: selected.current,
    clickedText: clicked,
  });

  I.wait(2);

  const cartClicked = await I.executeScript(() => {
    const nodes = Array.from(document.querySelectorAll("button,a,div,span"));
    for (const el of nodes) {
      const txt = (el.innerText || "").toLowerCase();
      if (!txt) continue;
      if (!txt.includes("sepet")) continue;
      try {
        el.click();
        return txt;
      } catch {}
    }
    return null;
  }).catch(() => null);

  I.wait(2);

  const cartUrl = await I.grabCurrentUrl().catch(() => "");
  add("cart:open", {
    url: selected.url,
    cartUrl,
    clickedText: cartClicked,
  });

  I.saveScreenshot("probe_then_run_cart.png");

  const removed = await I.executeScript(() => {
    const nodes = Array.from(document.querySelectorAll("button,a,div,span"));
    const hints = ["sil", "kaldır", "çıkar", "remove", "delete"];

    for (const el of nodes) {
      const txt = (el.innerText || "").toLowerCase();
      if (!txt) continue;
      if (!hints.some(h => txt.includes(h))) continue;
      try {
        el.click();
        return txt;
      } catch {}
    }

    return null;
  }).catch(() => null);

  if (!removed) {
    add("cart:remove:skip", {
      url: selected.url,
      cartUrl,
      reason: "remove_not_found",
    });
  } else {
    add("cart:remove", {
      url: selected.url,
      cartUrl,
      clickedText: removed,
    });
    I.wait(2);
    I.saveScreenshot("probe_then_run_after_remove.png");
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    startedAt,
    finishedAt,
    dataset,
    status: "completed",
    selected,
    totals: {
      urls: urls.length,
      selected: 1,
      skipped: events.filter(e => e.event === "url:skip").length,
      addOk: events.filter(e => e.event === "cart:add").length,
      removeOk: events.filter(e => e.event === "cart:remove").length,
    },
    events,
  };

  fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2), "utf8");
  I.say(`WROTE=${reportFile}`);
});

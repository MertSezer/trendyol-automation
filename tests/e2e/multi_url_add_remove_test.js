const fs = require("fs");
const path = require("path");
const { I } = inject();

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

  function crAdd(event, data = {}) {
    events.push({
      ts: new Date().toISOString(),
      event,
      ...data,
    });
  }

  I.say(`DATASET=${dataset}`);
  crAdd("run:start", { dataset });

  if (!fs.existsSync(dataset)) {
    crAdd("run:error", { reason: "dataset_not_found", dataset });
    fs.writeFileSync(reportFile, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), events }, null, 2), "utf8");
    throw new Error(`Dataset not found: ${dataset}`);
  }

  const urls = fs
    .readFileSync(dataset, "utf8")
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  I.say(`URL count=${urls.length}`);
  crAdd("run:urls", { count: urls.length });

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const idx = i + 1;

    I.say(`OPEN [${idx}/${urls.length}] ${url}`);
    crAdd("url:open", { idx, total: urls.length, url });

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

    const listingLike =
      !current.includes("-p-") ||
      current.includes("/sr?") ||
      current.includes("/sirali-urunler") ||
      current.includes("/cok-satanlar") ||
      current.includes("butik/liste");

    const genericTitle =
      (title || "").includes("Online Alışveriş Sitesi") ||
      (title || "").includes("Türkiye’nin Trend Yolu") ||
      (title || "").includes("Arama Sonuçları");

    if (listingLike || genericTitle) {
      I.say(`SKIP: not product page -> ${current}`);
      crAdd("url:skip", {
        idx,
        total: urls.length,
        url,
        current,
        title,
        reason: "not_product_page",
      });
      continue;
    }

    crAdd("url:ok", {
      idx,
      total: urls.length,
      url,
      current,
      title,
    });

    I.saveScreenshot(`pdp_${idx}.png`);

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
      I.say("SKIP: add-to-cart not found");
      crAdd("cart:add:skip", {
        idx,
        total: urls.length,
        url,
        current,
        reason: "add_to_cart_not_found",
      });
      continue;
    }

    I.say(`[add-to-cart] clicked: ${clicked}`);
    crAdd("cart:add", {
      idx,
      total: urls.length,
      url,
      current,
      clickedText: clicked,
    });

    I.wait(2);

    const cartClicked = await I.executeScript(() => {
      const nodes = Array.from(document.querySelectorAll("button,a,div,span"));

      for (const el of nodes) {
        const txt = (el.innerText || "").toLowerCase();
        if (!txt) continue;

        if (txt.includes("sepet")) {
          try {
            el.click();
            return txt;
          } catch {}
        }
      }

      return null;
    }).catch(() => null);

    I.wait(2);

    const cartUrl = await I.grabCurrentUrl().catch(() => "");
    crAdd("cart:open", {
      idx,
      total: urls.length,
      url,
      cartUrl,
      clickedText: cartClicked,
    });

    I.saveScreenshot(`cart_${idx}.png`);

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
      crAdd("cart:remove:skip", {
        idx,
        total: urls.length,
        url,
        cartUrl,
        reason: "remove_not_found",
      });
      I.wait(1);
      continue;
    }

    crAdd("cart:remove", {
      idx,
      total: urls.length,
      url,
      cartUrl,
      clickedText: removed,
    });

    I.wait(2);
    I.saveScreenshot(`after_remove_${idx}.png`);
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    startedAt,
    finishedAt,
    dataset,
    totals: {
      urls: urls.length,
      opened: events.filter(e => e.event === "url:open").length,
      ok: events.filter(e => e.event === "url:ok").length,
      skipped: events.filter(e => e.event === "url:skip").length,
      addOk: events.filter(e => e.event === "cart:add").length,
      removeOk: events.filter(e => e.event === "cart:remove").length,
    },
    events,
  };

  fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2), "utf8");
  I.say(`WROTE=${reportFile}`);
});

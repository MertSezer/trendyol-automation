"use strict";

const { UiEngine } = require("../core/UiEngine");
const { ProductPage } = require("../pages/ProductPage");
const { CartPage } = require("../pages/CartPage");

function asInt(x, dflt) {
  const n = Number(x);
  return Number.isFinite(n) ? n : dflt;
}

/**
 * TopColorsAddRemoveFlow
 * - Discover color variants on product page (best-effort)
 * - For top N colors: select -> add-to-cart -> go cart -> remove
 */
class TopColorsAddRemoveFlow {
  constructor({ I, caseReport, topN = 3 }) {
    this.I = I;
    this.caseReport = caseReport || null;
    this.topN = asInt(topN, 3);

    this.engine = new UiEngine({ I });
    this.product = new ProductPage({ I, engine: this.engine });
    this.cart = new CartPage({ I, engine: this.engine });
  }

  _crAdd(event, data) {
    try { if (this.caseReport) this.caseReport.add(event, data); } catch (_) {}
  }

  _now() { return Date.now(); }

  /**
   * Returns discovered colors as [{ idx, label }]
   * idx is a stable index for click-by-index execution.
   */
  async discoverColors() {
    // Runs in browser context; tries multiple heuristics
    const colors = await this.I.executeScript(function () {
      const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

      // Candidate regions containing color options
      const regionSelectors = [
        '[data-testid*="color"]',
        '[class*="color"]',
        '[class*="Colour"]',
        '[aria-label*="Renk"]',
        '[id*="color"]'
      ];

      const regions = [];
      for (const sel of regionSelectors) {
        document.querySelectorAll(sel).forEach((el) => regions.push(el));
      }

      // If no regions, fallback to entire document
      const scope = regions.length ? regions : [document];

      // Collect clickable nodes
      const clickable = [];
      for (const root of scope) {
        root.querySelectorAll('button, a, div[role="button"], span[role="button"], li').forEach((el) => {
          // visible-ish
          const r = el.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) return;

          // label sources
          const aria = el.getAttribute && el.getAttribute("aria-label");
          const title = el.getAttribute && el.getAttribute("title");
          const txt = (el.innerText || el.textContent || "").trim();

          const label = (aria || title || txt || "").trim();
          if (!label) return;

          // Heuristic: likely a color swatch label
          const l = norm(label);
          const looksLikeColor =
            l.includes("renk") ||
            l.includes("color") ||
            l.includes("siyah") || l.includes("beyaz") || l.includes("mavi") || l.includes("kırmızı") ||
            l.includes("yesil") || l.includes("yeşil") || l.includes("gri") || l.includes("mor") ||
            l.includes("pembe") || l.includes("kahve") || l.includes("lacivert") || l.includes("turuncu");

          // Also accept short labels (e.g., "Siyah", "Mavi") even without "renk"
          if (!looksLikeColor && label.length > 25) return;

          // de-dupe by text+position signature
          const sig = l + ":" + Math.round(r.left) + ":" + Math.round(r.top);
          clickable.push({ label: label, sig });
        });
      }

      // Unique by signature
      const uniq = [];
      const seen = new Set();
      for (const c of clickable) {
        if (seen.has(c.sig)) continue;
        seen.add(c.sig);
        uniq.push(c);
      }

      // Return top 10 max to keep stable
      return uniq.slice(0, 10).map((c, i) => ({ idx: i, label: c.label }));
    });

    return Array.isArray(colors) ? colors : [];
  }

  async selectColorByIndex(index) {
    // Re-run same discovery and click by index in one script to avoid stale refs
    const clicked = await this.I.executeScript(function (indexInner) {
      const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

      const regionSelectors = [
        '[data-testid*="color"]',
        '[class*="color"]',
        '[class*="Colour"]',
        '[aria-label*="Renk"]',
        '[id*="color"]'
      ];

      const regions = [];
      for (const sel of regionSelectors) {
        document.querySelectorAll(sel).forEach((el) => regions.push(el));
      }
      const scope = regions.length ? regions : [document];

      const clickable = [];
      for (const root of scope) {
        root.querySelectorAll('button, a, div[role="button"], span[role="button"], li').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) return;

          const aria = el.getAttribute && el.getAttribute("aria-label");
          const title = el.getAttribute && el.getAttribute("title");
          const txt = (el.innerText || el.textContent || "").trim();
          const label = (aria || title || txt || "").trim();
          if (!label) return;

          const l = norm(label);
          const looksLikeColor =
            l.includes("renk") || l.includes("color") ||
            l.includes("siyah") || l.includes("beyaz") || l.includes("mavi") || l.includes("kırmızı") ||
            l.includes("yesil") || l.includes("yeşil") || l.includes("gri") || l.includes("mor") ||
            l.includes("pembe") || l.includes("kahve") || l.includes("lacivert") || l.includes("turuncu");

          if (!looksLikeColor && label.length > 25) return;

          const sig = l + ":" + Math.round(r.left) + ":" + Math.round(r.top);
          clickable.push({ el, label, sig });
        });
      }

      const uniq = [];
      const seen = new Set();
      for (const c of clickable) {
        if (seen.has(c.sig)) continue;
        seen.add(c.sig);
        uniq.push(c);
      }

      const list = uniq.slice(0, 10);
      const idx = Number(indexInner);
      if (!Number.isFinite(idx) || idx < 0 || idx >= list.length) return null;

      const t = list[idx];
      try { t.el.scrollIntoView({ block: "center", inline: "center" }); } catch (_) {}
      try { t.el.click(); } catch (_) { return null; }
      return String(t.label || "");
    }, index);

    if (clicked) {
      await this.I.wait(0.8);
      return String(clicked);
    }
    return null;
  }

  async runOneUrl({ url, idx, total }) {
    const n = String(idx).padStart(2, "0");
    const tAll0 = this._now();

    this.I.say(`OPEN [${idx}/${total}] ${url}`);
    this._crAdd("url:start", { idx, url });

    // open product
    const tOpen0 = this._now();
    await this.product.open(url);
    const openMs = this._now() - tOpen0;

    const meta = await this.product.readMeta();
    await this.product.screenshot(`${n}_product.png`);

    // discover colors
    const colors = await this.discoverColors();
    this._crAdd("colors:discovered", { idx, url, count: colors.length, colors });

    if (!colors.length) {
      const totalMs = this._now() - tAll0;
      this._crAdd("timing:url", { idx, url, openMs, addMs: 0, cartMs: 0, removeMs: 0, totalMs, status: "skip" });
      this._crAdd("url:skip", { idx, url, reason: "no colors discovered", title: meta.title });
      return { status: "skip", opened: 1, added: 0, warn: 0, skip: 1 };
    }

    const top = colors.slice(0, this.topN);

    let added = 0, warn = 0, skip = 0;

    for (let ci = 0; ci < top.length; ci++) {
      const c = top[ci];
      this.I.say(`COLOR [${ci + 1}/${top.length}] ${c.label}`);
      this._crAdd("color:start", { idx, url, color: c });

      const clickedLabel = await this.selectColorByIndex(c.idx);
      if (!clickedLabel) {
        skip++;
        this._crAdd("color:skip", { idx, url, color: c, reason: "click failed" });
        continue;
      }

      await this.product.screenshot(`${n}_color_${String(ci + 1).padStart(2, "0")}.png`);

      // add-to-cart
      const tAdd0 = this._now();
      const addRes = await this.product.addToCartBestEffort();
      const addMs = this._now() - tAdd0;

      if (!addRes.ok) {
        skip++;
        this._crAdd("color:skip", { idx, url, color: c, reason: "add-to-cart not found", addMs });
        continue;
      }

      added++;
      await this.I.wait(2);
      await this.product.screenshot(`${n}_after_add_${String(ci + 1).padStart(2, "0")}.png`);

      // cart + remove
      const tCart0 = this._now();
      const cartNav = await this.cart.goToCartBestEffort();
      await this.I.wait(2);
      const cartMs = this._now() - tCart0;

      await this.cart.screenshot(`${n}_cart_${String(ci + 1).padStart(2, "0")}.png`);

      const tRem0 = this._now();
      const remRes = await this.cart.removeBestEffort();
      const removeMs = this._now() - tRem0;

      if (!remRes.ok) {
        warn++;
        this._crAdd("color:warn", { idx, url, color: c, reason: "remove not found", timings: { openMs, addMs, cartMs, removeMs } });
      } else {
        await this.I.wait(2);
        await this.cart.screenshot(`${n}_after_remove_${String(ci + 1).padStart(2, "0")}.png`);
      }

      const totalMs = this._now() - tAll0;
      this._crAdd("timing:url", { idx, url, openMs, addMs, cartMs, removeMs, totalMs, status: remRes.ok ? "ok" : "warn" });
      this._crAdd("color:done", { idx, url, color: c, addBtn: addRes.via, cartNav: cartNav.via, removed: remRes.via, timings: { openMs, addMs, cartMs, removeMs, totalMs } });
    }

    const totalMs = this._now() - tAll0;
    this._crAdd("url:ok", { idx, url, current: meta.current, title: meta.title, colorsTried: top.length, counters: { added, warn, skip }, totalMs });

    return { status: "ok", opened: 1, added, warn, skip };
  }
}

module.exports = { TopColorsAddRemoveFlow };
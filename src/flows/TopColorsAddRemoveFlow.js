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
  const norm = (s) => {
    const x = (s || "").toLowerCase().replace(/\s+/g, " ").trim();
    return x
      .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
      .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");
  };

  const labelCandidates = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span,p,dt,dd,label,strong,b"))
    .filter(el => {
      const t = norm(el.innerText || el.textContent);
      return t === "renk" || t.startsWith("renk ");
    })
    .slice(0, 10);

  function isBadRegion(el) {
    if (!el || !el.closest) return false;
    return !!el.closest("header,nav,footer,[data-testid*='header'],[data-testid*='footer']");
  }

  function pickContainer(el) {
    let cur = el;
    for (let i = 0; i < 6 && cur; i++) {
      const options = cur.querySelectorAll("button, li, label, div[role='button'], span[role='button'], input[type='radio']");
      if (options && options.length >= 2 && !isBadRegion(cur)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  let container = null;
  for (const l of labelCandidates) {
    container = pickContainer(l);
    if (container) break;
  }

  if (!container) {
    const blocks = Array.from(document.querySelectorAll(
      "[data-testid*='variant'],[data-testid*='product-variant'],[class*='variant'],[class*='Variant'],[class*='swatch'],[class*='Swatch']"
    )).filter(b => !isBadRegion(b));
    container = blocks.find(b => b.querySelectorAll("button, li, label, input[type='radio']").length >= 2) || null;
  }

  if (!container) return [];

  const raw = Array.from(container.querySelectorAll("button, li, label, div[role='button'], span[role='button'], input[type='radio']"))
    .filter(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return false;
      if (isBadRegion(el)) return false;
      return true;
    })
    .map(el => {
      const aria = el.getAttribute && el.getAttribute("aria-label");
      const title = el.getAttribute && el.getAttribute("title");
      const txt = (el.innerText || el.textContent || "").trim();

      const img = el.querySelector && el.querySelector("img");
      const imgAlt = img && (img.getAttribute("alt") || img.getAttribute("title")) || "";

      const input = el.querySelector && el.querySelector("input");
      const inputVal = input && (input.getAttribute("value") || input.getAttribute("aria-label")) || "";

      const dataVal =
        (el.getAttribute && (el.getAttribute("data-value") || el.getAttribute("data-variant") || el.getAttribute("data-color") || el.getAttribute("data-name"))) || "";

      const label = (aria || title || imgAlt || inputVal || dataVal || txt || "").trim();
      return { label, y: Math.round(el.getBoundingClientRect().top), x: Math.round(el.getBoundingClientRect().left) };
    })
    .filter(x => x.label);

  const uniq = [];
  const seen = new Set();
  for (const o of raw.sort((a,b)=> (a.y-b.y) || (a.x-b.x))) {
    const key = norm(o.label);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(o);
  }

  return uniq.slice(0, 10).map((o, i) => ({ idx: i, label: o.label }));
});});
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
  const norm = (s) => {
    const x = (s || "").toLowerCase().replace(/\s+/g, " ").trim();
    return x
      .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
      .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");
  };

  function isBadRegion(el) {
    if (!el || !el.closest) return false;
    return !!el.closest("header,nav,footer,[data-testid*='header'],[data-testid*='footer']");
  }

  const labelCandidates = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span,p,dt,dd,label,strong,b"))
    .filter(el => {
      const t = norm(el.innerText || el.textContent);
      return t === "renk" || t.startsWith("renk ");
    })
    .slice(0, 10);

  function pickContainer(el) {
    let cur = el;
    for (let i = 0; i < 6 && cur; i++) {
      const options = cur.querySelectorAll("button, li, label, div[role='button'], span[role='button'], input[type='radio']");
      if (options && options.length >= 2 && !isBadRegion(cur)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  let container = null;
  for (const l of labelCandidates) {
    container = pickContainer(l);
    if (container) break;
  }

  if (!container) {
    const blocks = Array.from(document.querySelectorAll(
      "[data-testid*='variant'],[data-testid*='product-variant'],[class*='variant'],[class*='Variant'],[class*='swatch'],[class*='Swatch']"
    )).filter(b => !isBadRegion(b));
    container = blocks.find(b => b.querySelectorAll("button, li, label, input[type='radio']").length >= 2) || null;
  }

  if (!container) return null;

  const nodes = Array.from(container.querySelectorAll("button, li, label, div[role='button'], span[role='button'], input[type='radio']"))
    .filter(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return false;
      if (isBadRegion(el)) return false;
      return true;
    })
    .map(el => {
      const aria = el.getAttribute && el.getAttribute("aria-label");
      const title = el.getAttribute && el.getAttribute("title");
      const txt = (el.innerText || el.textContent || "").trim();

      const img = el.querySelector && el.querySelector("img");
      const imgAlt = img && (img.getAttribute("alt") || img.getAttribute("title")) || "";

      const input = el.querySelector && el.querySelector("input");
      const inputVal = input && (input.getAttribute("value") || input.getAttribute("aria-label")) || "";

      const dataVal =
        (el.getAttribute && (el.getAttribute("data-value") || el.getAttribute("data-variant") || el.getAttribute("data-color") || el.getAttribute("data-name"))) || "";

      const label = (aria || title || imgAlt || inputVal || dataVal || txt || "").trim();
      return { el, label, y: Math.round(el.getBoundingClientRect().top), x: Math.round(el.getBoundingClientRect().left) };
    })
    .filter(x => x.label);

  const uniq = [];
  const seen = new Set();
  for (const o of nodes.sort((a,b)=> (a.y-b.y) || (a.x-b.x))) {
    const key = norm(o.label);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(o);
  }

  const list = uniq.slice(0, 10);
  const idx = Number(indexInner);
  if (!Number.isFinite(idx) || idx < 0 || idx >= list.length) return null;

  const t = list[idx];
  try { t.el.scrollIntoView({ block: "center", inline: "center" }); } catch (_) {}
  try { t.el.click(); } catch (_) { return null; }
  return String(t.label || "");
}, index);if (clicked) {
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
this.I.say("COLORS_FOUND=" + String(colors.length));
this.I.say("COLORS_SAMPLE=" + colors.slice(0, 5).map(x => x.label).join(" | "));
this._crAdd("colors:discovered", { idx, url, count: colors.length, colors });if (!colors.length) {
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
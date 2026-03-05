"use strict";

const { UiEngine } = require("../core/UiEngine");
const { ProductPage } = require("../pages/ProductPage");
const { CartPage } = require("../pages/CartPage");

function asInt(x, dflt) {
  const n = parseInt(String(x ?? "").trim(), 10);
  return Number.isFinite(n) ? n : dflt;
}

/**
 * TopColorsAddRemoveFlow
 * NOTE: "color" here means "variant options near the 'Renk' label" (or variant/swatch blocks).
 * We intentionally exclude header/nav/footer to avoid false positives.
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

  async discoverColors() {
    const colors = await this.I.executeScript(function () {
      const norm = (s) => {
  const x = (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  // Unicode-escape based TR normalization (encoding-proof)
  return x
    .replace(/\u0131/g, "i")  // Ä±
    .replace(/\u011f/g, "g")  // ÄŸ
    .replace(/\u00fc/g, "u")  // Ã¼
    .replace(/\u015f/g, "s")  // ÅŸ
    .replace(/\u00f6/g, "o")  // Ã¶
    .replace(/\u00e7/g, "c"); // Ã§
};

      function isBadRegion(el) {
        if (!el || !el.closest) return false;
        return !!el.closest("header,nav,footer,[data-testid*='header'],[data-testid*='footer']");
      }

      // Find a container near a "Renk" label
      const labelCandidates = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span,p,dt,dd,label,strong,b"))
        .filter(el => {
          const t = norm(el.innerText || el.textContent);
          return t === "renk" || t.startsWith("renk ");
        })
        .slice(0, 10);

      function pickContainer(el) {
        let cur = el;
        for (let i = 0; i < 7 && cur; i++) {
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

      // Fallback: try known variant blocks (still exclude header/footer)
      if (!container) {
        const blocks = Array.from(document.querySelectorAll(
          "[data-testid*='variant'],[data-testid*='product-variant'],[class*='variant'],[class*='Variant'],[class*='swatch'],[class*='Swatch']"
        )).filter(b => !isBadRegion(b));
        container = blocks.find(b => b.querySelectorAll("button, li, label, input[type='radio']").length >= 2) || null;
      }

      if (!container) return [];

      const nodes = Array.from(container.querySelectorAll(
        "button, li, label, div[role='button'], span[role='button'], input[type='radio']"
      )).filter(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return false;
        if (isBadRegion(el)) return false;
              // Strict candidate rules to avoid picking informational texts:
      // - buttons always ok
      // - inputs always ok
      // - labels ok only if they contain an input
      // - li/div/span ok only if role=button OR contains input OR has aria-selected/pressed
      const tag = (el.tagName || "").toLowerCase();
      const hasInput = !!(el.querySelector && el.querySelector("input"));
      const roleBtn = (el.getAttribute && el.getAttribute("role")) === "button";
      const ariaSel = (el.getAttribute && (el.getAttribute("aria-selected") || el.getAttribute("aria-pressed"))) != null;

      if (tag === "button") return true;
      if (tag === "input") return true;
      if (tag === "label") return hasInput;
      if (roleBtn || hasInput || ariaSel) return true;

      return false;
    });

      const raw = nodes.map(el => {
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

        const r = el.getBoundingClientRect();
        return { label, y: Math.round(r.top), x: Math.round(r.left) };
      }).filter(x => x.label);

      const uniq = [];
      const seen = new Set();
      for (const o of raw.sort((a, b) => (a.y - b.y) || (a.x - b.x))) {
        const key = norm(o.label);
        if (seen.has(key)) continue;
        seen.add(key);
        uniq.push(o);
      }

      return uniq.slice(0, 10).map((o, i) => ({ idx: i, label: o.label }));
    });

    return Array.isArray(colors) ? colors : [];
  }

  async selectColorByIndex(index) {
    const clicked = await this.I.executeScript(function (indexInner) {
      const norm = (s) => {
  const x = (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  // Unicode-escape based TR normalization (encoding-proof)
  return x
    .replace(/\u0131/g, "i")  // Ä±
    .replace(/\u011f/g, "g")  // ÄŸ
    .replace(/\u00fc/g, "u")  // Ã¼
    .replace(/\u015f/g, "s")  // ÅŸ
    .replace(/\u00f6/g, "o")  // Ã¶
    .replace(/\u00e7/g, "c"); // Ã§
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
        for (let i = 0; i < 7 && cur; i++) {
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

      const nodes = Array.from(container.querySelectorAll(
        "button, li, label, div[role='button'], span[role='button'], input[type='radio']"
      )).filter(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return false;
        if (isBadRegion(el)) return false;
              // Strict candidate rules to avoid picking informational texts:
      // - buttons always ok
      // - inputs always ok
      // - labels ok only if they contain an input
      // - li/div/span ok only if role=button OR contains input OR has aria-selected/pressed
      const tag = (el.tagName || "").toLowerCase();
      const hasInput = !!(el.querySelector && el.querySelector("input"));
      const roleBtn = (el.getAttribute && el.getAttribute("role")) === "button";
      const ariaSel = (el.getAttribute && (el.getAttribute("aria-selected") || el.getAttribute("aria-pressed"))) != null;

      if (tag === "button") return true;
      if (tag === "input") return true;
      if (tag === "label") return hasInput;
      if (roleBtn || hasInput || ariaSel) return true;

      return false;
    });

      const raw = nodes.map(el => {
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

        const r = el.getBoundingClientRect();
        return { el, label, y: Math.round(r.top), x: Math.round(r.left) };
      }).filter(x => x.label);

      const uniq = [];
      const seen = new Set();
      for (const o of raw.sort((a, b) => (a.y - b.y) || (a.x - b.x))) {
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

    const tOpen0 = this._now();
    await this.product.open(url);
    const openMs = this._now() - tOpen0;

    const meta = await this.product.readMeta();
await this.product.screenshot(`${n}_product.png`);

// blocked / anti-bot detection (Cloudflare etc.)
const titleNorm = String(meta.title || "").toLowerCase();
if (
  titleNorm.includes("cloudflare") ||
  titleNorm.includes("attention required") ||
  titleNorm.includes("access denied") ||
  titleNorm.includes("forbidden") ||
  titleNorm.includes("captcha")
) {
  const totalMs = this._now() - tAll0;
  this.I.say("SKIP: blocked by anti-bot (Cloudflare)");
  this._crAdd("timing:url", { idx, url, openMs, addMs: 0, cartMs: 0, removeMs: 0, totalMs, status: "skip" });
  this._crAdd("url:skip", { idx, url, reason: "blocked/anti-bot", title: meta.title });
  return { status: "skip", opened: 1, added: 0, warn: 0, skip: 1 };
}

// 404/blocked detection (best-effort)
const titleNorm = String(meta.title || "").toLowerCase();
if (titleNorm.includes("error 404") || titleNorm.includes("404") || titleNorm.includes("not found")) {
  const totalMs = this._now() - tAll0;
  this.I.say("SKIP: product page looks like 404/not-found");
  this._crAdd("timing:url", { idx, url, openMs, addMs: 0, cartMs: 0, removeMs: 0, totalMs, status: "skip" });
  this._crAdd("url:skip", { idx, url, reason: "page 404/not-found", title: meta.title });
  return { status: "skip", opened: 1, added: 0, warn: 0, skip: 1 };
}const colors = await this.discoverColors();
    this.I.say("COLORS_FOUND=" + String(colors.length));
    this.I.say("COLORS_SAMPLE=" + colors.slice(0, 5).map(x => x.label).join(" | "));
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
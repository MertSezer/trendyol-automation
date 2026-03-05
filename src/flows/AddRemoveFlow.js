"use strict";


const { ResilientUi } = require("../core/ResilientUi");
const { UiEngine } = require("../core/UiEngine");
const { ProductPage } = require("../pages/ProductPage");
const { CartPage } = require("../pages/CartPage");

class AddRemoveFlow {
  constructor({ I, caseReport }) {
    
    this.ui = new ResilientUi(I);
this.I = I;
    this.caseReport = caseReport || null;
    this.engine = new UiEngine({ I });
    this.product = new ProductPage({ I, engine: this.engine });
    this.cart = new CartPage({ I, engine: this.engine });
  }

  _crAdd(type, payload) {
    try { if (this.caseReport) this.caseReport.add(type, payload); } catch (_) {}
  }

  _now() { return Date.now(); }

  async runOne({ url, idx, total }) {
    const n = String(idx).padStart(2, "0");
    const tAll0 = this._now();

    this.I.say(`OPEN [${idx}/${total}] ${url}`);
    this._crAdd("url:start", { idx, url });

    // --- OPEN ---
    const tOpen0 = this._now();
    await this.product.open(url);
    const openMs = this._now() - tOpen0;

    const { current, title } = await this.product.readMeta();
    this.I.say("CURRENT=" + current);
    this.I.say("TITLE=" + title);

    await this.product.screenshot(`${n}_product.png`);

    // --- ADD ---
    const tAdd0 = this._now();
    const add = await this.product.addToCartBestEffort();
    const addMs = this._now() - tAdd0;

    if (!add.ok) {
      this.I.say("SKIP add-to-cart (button not found)");
      const totalMs = this._now() - tAll0;

      this._crAdd("timing:url", { idx, url, openMs, addMs, cartMs: 0, removeMs: 0, totalMs, status: "skip" });
      this._crAdd("url:skip", { idx, url, reason: "add-to-cart not found", title, timings: { openMs, addMs, totalMs } });

      return { status: "skip", opened: 1, added: 0, warn: 0, skip: 1, timings: { openMs, addMs, cartMs: 0, removeMs: 0, totalMs } };
    }

    this.I.say("Clicked add-to-cart via: " + add.via);
    await this.I.wait(2);
    await this.product.screenshot(`${n}_after_add.png`);

    // --- CART NAV ---
    const tCart0 = this._now();
    const cartNav = await this.cart.goToCartBestEffort();
    await this.I.wait(2);
    const cartMs = this._now() - tCart0;

    await this.cart.screenshot(`${n}_cart.png`);

    // --- REMOVE ---
    const tRem0 = this._now();
    const removed = await this.cart.removeBestEffort();
    const removeMs = this._now() - tRem0;

    if (!removed.ok) {
      this.I.say("WARN: could not find remove button");
      const totalMs = this._now() - tAll0;

      this._crAdd("timing:url", { idx, url, openMs, addMs, cartMs, removeMs, totalMs, status: "warn" });
      this._crAdd("url:warn", { idx, url, reason: "remove not found", timings: { openMs, addMs, cartMs, removeMs, totalMs } });

      return {
        status: "warn",
        opened: 1,
        added: 1,
        warn: 1,
        skip: 0,
        timings: { openMs, addMs, cartMs, removeMs, totalMs },
        details: { current, title, addBtn: add.via, cartNav: cartNav.via }
      };
    }

    this.I.say("Removed via: " + removed.via);
    await this.I.wait(2);
    await this.cart.screenshot(`${n}_after_remove.png`);

    const totalMs = this._now() - tAll0;
    this._crAdd("timing:url", { idx, url, openMs, addMs, cartMs, removeMs, totalMs, status: "ok" });

    this._crAdd("url:ok", {
      idx, url, current, title,
      addBtn: add.via,
      cartNav: cartNav.via,
      removed: removed.via,
      timings: { openMs, addMs, cartMs, removeMs, totalMs }
    });

    return { status: "ok", opened: 1, added: 1, warn: 0, skip: 0, timings: { openMs, addMs, cartMs, removeMs, totalMs } };
  }
}

module.exports = { AddRemoveFlow };
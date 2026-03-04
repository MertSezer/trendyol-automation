"use strict";

const { UiEngine } = require("../core/UiEngine");
const { ProductPage } = require("../pages/ProductPage");
const { CartPage } = require("../pages/CartPage");

class AddRemoveFlow {
  constructor({ I, caseReport }) {
    this.I = I;
    this.caseReport = caseReport || null;
    this.engine = new UiEngine({ I });
    this.product = new ProductPage({ I, engine: this.engine });
    this.cart = new CartPage({ I, engine: this.engine });
  }

  _crAdd(type, payload) {
    try { if (this.caseReport) this.caseReport.add(type, payload); } catch (_) {}
  }

  async runOne({ url, idx, total }) {
    const n = String(idx).padStart(2, "0");

    this.I.say(`OPEN [${idx}/${total}] ${url}`);
    this._crAdd("url:start", { idx, url });

    await this.product.open(url);

    const { current, title } = await this.product.readMeta();
    this.I.say("CURRENT=" + current);
    this.I.say("TITLE=" + title);

    await this.product.screenshot(`${n}_product.png`);

    const add = await this.product.addToCartBestEffort();
    if (!add.ok) {
      this.I.say("SKIP add-to-cart (button not found)");
      this._crAdd("url:skip", { idx, url, reason: "add-to-cart not found", title });
      return { status: "skip", opened: 1, added: 0, warn: 0, skip: 1 };
    }

    this.I.say("Clicked add-to-cart via: " + add.via);
    await this.I.wait(2);
    await this.product.screenshot(`${n}_after_add.png`);

    const cartNav = await this.cart.goToCartBestEffort();
    await this.I.wait(2);
    await this.cart.screenshot(`${n}_cart.png`);

    const removed = await this.cart.removeBestEffort();
    if (!removed.ok) {
      this.I.say("WARN: could not find remove button");
      this._crAdd("url:warn", { idx, url, reason: "remove not found" });
      return { status: "warn", opened: 1, added: 1, warn: 1, skip: 0, details: { current, title, addBtn: add.via, cartNav: cartNav.via } };
    }

    this.I.say("Removed via: " + removed.via);
    await this.I.wait(2);
    await this.cart.screenshot(`${n}_after_remove.png`);

    this._crAdd("url:ok", { idx, url, current, title, addBtn: add.via, cartNav: cartNav.via, removed: removed.via });
    return { status: "ok", opened: 1, added: 1, warn: 0, skip: 0 };
  }
}

module.exports = { AddRemoveFlow };
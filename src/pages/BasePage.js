"use strict";

class BasePage {
  constructor({ I, engine }) {
    this.I = I;
    this.engine = engine;
  }

  async screenshot(name) {
    try {
      await this.I.saveScreenshot(name);
      return true;
    } catch (_) {
      return false;
    }
  }
}

module.exports = { BasePage };
"use strict";

const { ResilientUi } = require("./ResilientUi");

/**
 * UiEngine: project-level UI helper.
 * Delegates flaky click behavior to ResilientUi.
 */
class UiEngine {
  /**
   * @param {any} I CodeceptJS actor
   */
  constructor(I) {
    this.I = I;
    this.resilient = new ResilientUi(I);
  }

  /**
   * Best-effort overlay dismiss.
   * Never throws.
   */
  async dismissOverlays() {
    try {
      // if project has an I.dismissPopups helper, use it
      if (this.I && typeof this.I.dismissPopups === "function") {
        await this.I.dismissPopups();
      }
    } catch (_) {}
    // plus resilient dismiss
    await this.resilient.dismissOverlays();
  }

  /**
   * Click by any of the given texts. Returns clicked text or null.
   * @param {string[]|string} texts
   * @param {{ postWaitSec?: number, step?: string, retries?: number }} [opts]
   */
  async clickByText(texts, { postWaitSec = 0.8, step = "ui:click", retries } = {}) {
    const pauseMs = Math.round(Number(postWaitSec || 0) * 1000);
    const arr = Array.isArray(texts) ? texts : [texts];
    return await this.resilient.clickByTexts(arr, { step, pauseMs, retries });
  }

  /**
   * Try clicking one of multiple candidate labels/text arrays.
   * Returns { ok, via, label } for reporting convenience.
   * @param {string} label logical label
   * @param {string[]|string} byText array(s) of texts
   */
  async tryClickOneOf(label, byText) {
    const via = await this.clickByText(byText, { postWaitSec: 0.8, step: label });
    if (via) return { ok: true, via, label };
    return { ok: false, via: null, label };
  }
}

module.exports = { UiEngine };

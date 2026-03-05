"use strict";

const { ResilientUi } = require("./ResilientUi");

/**
 * UiEngine: project-level UI helper wrapper.
 * Keeps backward compatibility for pages:
 * - dismissOverlays()
 * - clickByText(texts, {postWaitSec, step, retries})
 * - safeClick({label, byText, postWaitSec, retries}) OR safeClick(texts, opts)
 */
class UiEngine {
  /**
   * @param {{ I: any, caseReport?: any }} deps
   */
  constructor({ I, caseReport } = {}) {
    this.I = I;
    this.caseReport = caseReport || null;
    this.resilient = new ResilientUi(I);
  }

  async dismissOverlays() {
    await this.resilient.dismissOverlays();
  }

  /**
   * Click by one or many texts.
   * @param {string[]|string} texts
   * @param {{ postWaitSec?: number, step?: string, retries?: number }} [opts]
   * @returns {Promise<string|null>} clicked text (normalized) or null
   */
  async clickByText(texts, { postWaitSec = 0.8, step = "ui:click", retries } = {}) {
    const pauseMs = Math.round(Number(postWaitSec || 0) * 1000);
    return await this.resilient.clickByTexts(texts, { step, retries, pauseMs });
  }

  /**
   * Used by older code: tryClickOneOf(label, byText)
   * Returns { ok, via, label }
   */
  async tryClickOneOf(label, byText) {
    const clicked = await this.clickByText(byText, { postWaitSec: 0.8, step: label || "ui:click" });
    if (clicked) return { ok: true, via: "text:" + clicked, label: label || "ui:click" };
    return { ok: false, via: null, label: label || "ui:click" };
  }

  /**
   * Backward-compatible safeClick.
   * Supports:
   * - safeClick({ label, byText, postWaitSec, retries })
   * - safeClick(texts, { postWaitSec, step, retries })
   */
  async safeClick(arg1, arg2 = {}) {
    // object signature: { label, byText, postWaitSec, retries }
    if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1)) {
      const label = arg1.label || "ui:click";
      const byText = arg1.byText || arg1.texts || [];
      const postWaitSec = Number.isFinite(arg1.postWaitSec) ? arg1.postWaitSec : 0.8;
      const retries = arg1.retries;
      const clicked = await this.clickByText(byText, { postWaitSec, step: label, retries });
      if (clicked) return { ok: true, via: "text:" + clicked, label };
      return { ok: false, via: null, label };
    }

    // plain signature
    const texts = arg1;
    const step = arg2.step || "ui:click";
    const postWaitSec = Number.isFinite(arg2.postWaitSec) ? arg2.postWaitSec : 0.8;
    const retries = arg2.retries;
    const clicked = await this.clickByText(texts, { postWaitSec, step, retries });
    if (clicked) return { ok: true, via: "text:" + clicked, label: step };
    return { ok: false, via: null, label: step };
  }

  async safeClickOneOf(label, byText) {
    return await this.tryClickOneOf(label, byText);
  }
}

module.exports = { UiEngine };
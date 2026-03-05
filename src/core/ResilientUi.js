"use strict";

/**
 * Resilient UI actions layer for flaky real-world pages:
 * - retries
 * - scroll into view
 * - best-effort overlay dismiss
 * - safe clicking by multiple localized texts
 *
 * Works with CodeceptJS Actor.
 */
class ResilientUi {
  /**
   * @param {any} actor CodeceptJS actor (usually {I})
   * @param {{ retries?: number, pauseMs?: number }} [defaults]
   */
  constructor(actor, defaults = {}) {
    this.I = ResilientUi._resolveActor(actor);
    this.defaults = {
      retries: Number.isFinite(defaults.retries) ? defaults.retries : 3,
      pauseMs: Number.isFinite(defaults.pauseMs) ? defaults.pauseMs : 800,
    };
  }

  /** Accept actor or wrappers ({I}, { actor }) and return actual actor */
  static _resolveActor(x) {
    if (!x) return x;
    if (typeof x.executeScript === "function" && typeof x.wait === "function") return x;
    if (x.I && typeof x.I.executeScript === "function") return x.I;
    if (x.actor && typeof x.actor.executeScript === "function") return x.actor;
    return x;
  }

  _assertActor() {
    const I = this.I;
    if (!I || typeof I.executeScript !== "function") {
      const got = I ? Object.keys(I).slice(0, 25).join(",") : "null/undefined";
      throw new Error(
        `ResilientUi: invalid actor (executeScript missing). Got keys: ${got}`
      );
    }
    return I;
  }

  async pause(ms) {
    const I = this.I;
    const s = Math.max(0, Number(ms || 0)) / 1000;
    if (I && typeof I.wait === "function" && s > 0) await I.wait(s);
  }

  /**
   * Best-effort overlay/cookie/modal dismiss. Never throws.
   */
  async dismissOverlays() {
    try {
      const I = this._assertActor();
      await I.executeScript(() => {
        const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

        const candidates = Array.from(document.querySelectorAll(
          "button, a, div[role='button'], span[role='button']"
        ));

        const closeHints = [
          "kapat", "tamam", "anladim", "anladım",
          "accept", "agree", "i agree", "got it", "ok",
          "cookie", "çerez", "cerez",
          "close", "dismiss"
        ].map(norm);

        for (const el of candidates) {
          const t = norm(el.innerText || el.textContent);
          const aria = norm(el.getAttribute && el.getAttribute("aria-label"));
          const title = norm(el.getAttribute && el.getAttribute("title"));
          const all = `${t} ${aria} ${title}`.trim();
          if (!all) continue;

          const looksClose =
            all.includes("×") ||
            closeHints.some((h) => h && all.includes(h));

          if (!looksClose) continue;

          const r = el.getBoundingClientRect();
          if (r.width < 10 || r.height < 10) continue;

          try { el.click(); } catch (_) {}
        }
      });
    } catch (_) {
      // ignore
    }
  }

  /**
   * Click first element whose visible text includes any of given targets.
   *
   * @param {string[]|string} targets
   * @param {{ step?: string, retries?: number, pauseMs?: number }} [opts]
   * @returns {Promise<string|null>} clicked text (normalized) or null
   */
  async clickByTexts(targets, opts = {}) {
    const I = this._assertActor();

    const step = opts.step || "ui:click";
    const retries = Number.isFinite(opts.retries) ? opts.retries : this.defaults.retries;
    const pauseMs = Number.isFinite(opts.pauseMs) ? opts.pauseMs : this.defaults.pauseMs;

    const t = (Array.isArray(targets) ? targets : [targets])
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    for (let attempt = 1; attempt <= retries; attempt++) {
      await this.dismissOverlays();

      const clicked = await I.executeScript((textsInner) => {
        const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
        const target = (textsInner || []).map(norm).filter(Boolean);

        const nodes = Array.from(document.querySelectorAll(
          "button, a, div[role='button'], span[role='button']"
        ));

        for (const el of nodes) {
          const txt = norm(el.innerText || el.textContent);
          if (!txt) continue;
          if (!target.some((tt) => txt.includes(tt))) continue;

          if (el.disabled) continue;
          const ariaDisabled = (el.getAttribute && el.getAttribute("aria-disabled")) || "";
          if (String(ariaDisabled).toLowerCase() === "true") continue;

          try { el.scrollIntoView({ block: "center", inline: "center" }); } catch (_) {}
          try { el.click(); return txt; } catch (_) {}
        }
        return null;
      }, t);

      if (clicked) {
        I.say(`[${step}] clicked: ${clicked} (attempt ${attempt}/${retries})`);
        await this.pause(pauseMs);
        return String(clicked);
      }

      I.say(`[${step}] not found (attempt ${attempt}/${retries})`);
      await this.pause(pauseMs);
    }

    I.say(`[${step}] giving up after ${retries} attempts`);
    return null;
  }
}

module.exports = { ResilientUi };
"use strict";

/**
 * Resilient UI actions layer for flaky real-world pages:
 * - retries
 * - scroll into view
 * - best-effort overlay dismiss
 * - safe clicking by multiple localized texts
 *
 * Designed to work with CodeceptJS "I" helper.
 */
class ResilientUi {
  /**
   * @param {any} I CodeceptJS actor
   * @param {{ retries?: number, pauseMs?: number }} [defaults]
   */
  constructor(I, defaults = {}) {
    this.I = I;
    this.defaults = {
      retries: Number.isFinite(defaults.retries) ? defaults.retries : 3,
      pauseMs: Number.isFinite(defaults.pauseMs) ? defaults.pauseMs : 800,
    };
  }

  async pause(ms) {
    const s = Math.max(0, Number(ms || 0)) / 1000;
    if (s > 0) await this.I.wait(s);
  }

  /**
   * Best-effort overlay/cookie/modal dismiss.
   * Never throws.
   */
  async dismissOverlays() {
    try {
      await this.I.executeScript(() => {
        const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

        // common "close" selectors
        const candidates = Array.from(document.querySelectorAll(
          "button, a, div[role='button'], span[role='button']"
        ));

        const closeHints = [
          "kapat", "kapat x", "tamam", "anladim", "anladım",
          "accept", "agree", "i agree", "got it", "ok",
          "cookie", "çerez", "cerez",
          "close", "dismiss"
        ].map(norm);

        // click small X / close-like buttons
        for (const el of candidates) {
          const t = norm(el.innerText || el.textContent);
          const aria = norm(el.getAttribute && el.getAttribute("aria-label"));
          const title = norm(el.getAttribute && el.getAttribute("title"));
          const all = `${t} ${aria} ${title}`.trim();

          if (!all) continue;

          // heuristic: close button often contains × or "kapat/close"
          const looksClose =
            all.includes("×") ||
            closeHints.some((h) => h && all.includes(h));

          if (!looksClose) continue;

          const r = el.getBoundingClientRect();
          if (r.width < 10 || r.height < 10) continue;

          try { el.click(); } catch (_) {}
        }

        // remove common overlays by style (best effort)
        const overlays = Array.from(document.querySelectorAll(
          "[class*='overlay'],[class*='modal'],[class*='backdrop']"
        ));
        for (const o of overlays) {
          const st = window.getComputedStyle(o);
          if (st && st.position === "fixed" && st.zIndex && Number(st.zIndex) > 999) {
            // don't remove, just attempt click away
            try { o.click(); } catch (_) {}
          }
        }
      });
    } catch (_) {
      // ignore
    }
  }

  /**
   * Click first element whose visible text includes any of given targets.
   * Retries + overlay dismiss between retries.
   *
   * @param {string[]} targets texts like ["sepete ekle", "add to cart"]
   * @param {{ step?: string, retries?: number, pauseMs?: number }} [opts]
   * @returns {Promise<string|null>} clicked text (normalized) or null
   */
  async clickByTexts(targets, opts = {}) {
    const step = opts.step || "clickByTexts";
    const retries = Number.isFinite(opts.retries) ? opts.retries : this.defaults.retries;
    const pauseMs = Number.isFinite(opts.pauseMs) ? opts.pauseMs : this.defaults.pauseMs;

    const t = (Array.isArray(targets) ? targets : [])
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    for (let attempt = 1; attempt <= retries; attempt++) {
      await this.dismissOverlays();

      const clicked = await this.I.executeScript((textsInner) => {
        const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
        const targets = (textsInner || []).map(norm).filter(Boolean);

        // prefer buttons/links/role=button
        const nodes = Array.from(document.querySelectorAll(
          "button, a, div[role='button'], span[role='button']"
        ));

        for (const el of nodes) {
          const txt = norm(el.innerText || el.textContent);
          if (!txt) continue;
          if (!targets.some((tt) => txt.includes(tt))) continue;

          // disabled?
          if (el.disabled) continue;
          const ariaDisabled = (el.getAttribute && el.getAttribute("aria-disabled")) || "";
          if (String(ariaDisabled).toLowerCase() === "true") continue;

          try { el.scrollIntoView({ block: "center", inline: "center" }); } catch (_) {}
          try { el.click(); return txt; } catch (_) {}
        }

        return null;
      }, t);

      if (clicked) {
        this.I.say(`[${step}] clicked: ${clicked} (attempt ${attempt}/${retries})`);
        await this.pause(pauseMs);
        return String(clicked);
      }

      this.I.say(`[${step}] not found (attempt ${attempt}/${retries})`);
      await this.pause(pauseMs);
    }

    this.I.say(`[${step}] giving up after ${retries} attempts`);
    return null;
  }
}

module.exports = { ResilientUi };

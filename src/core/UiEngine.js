"use strict";


const { ResilientUi } = require("./ResilientUi");
/**
 * UiEngine:
 * - safeClick: selectors + text fallback
 * - clickByText: DOM iÃƒÂ§inde text ile en uygun tÃ„Â±klanabilir ÃƒÂ¶Ã„Å¸eyi JS ile tÃ„Â±klar
 * - dismissOverlays: project-level dismiss (I.dismissPopups varsa ÃƒÂ§aÃ„Å¸Ã„Â±rÃ„Â±r)
 */
class UiEngine {
  constructor({ I }) {
    this.I = I;
  
    this.resilient = new ResilientUi(I);
}

  async waitSec(sec) {
    await this.I.wait(sec);
  }

  async dismissOverlays() {
    // project already has helper sometimes
    try {
      if (typeof this.I.dismissPopups === "function") {
        await this.I.dismissPopups();
      }
    } catch (_) {}
  }

  async tryClickAny(selectors, { postWaitSec = 0.5 } = {}) {
    for (const sel of selectors || []) {
      try {
        const n = await this.I.grabNumberOfElements(sel);
        if (n > 0) {
          await this.I.click(sel);
          if (postWaitSec) await this.I.wait(postWaitSec);
          return sel;
        }
      } catch (_) {}
    }
    return null;
  }

  async clickByText(texts, { postWaitSec = 0.8 } = {}) {
    try {
      const clicked = await this.I.executeScript(function (textsInner) {
        const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
        const targets = (textsInner || []).map(norm);

        const nodes = Array.from(
          document.querySelectorAll('button, a, div[role="button"], span[role="button"]')
        );

        for (const el of nodes) {
          const txt = norm(el.innerText || el.textContent);
          if (!txt) continue;
          if (!targets.some((t) => t && txt.includes(t))) continue;

          // skip disabled
          if (el.disabled) continue;
          const ariaDisabled = (el.getAttribute && el.getAttribute("aria-disabled")) || "";
          if (String(ariaDisabled).toLowerCase() === "true") continue;

          try { el.scrollIntoView({ block: "center", inline: "center" }); } catch (_) {}
          try { el.click(); return txt; } catch (_) {}
        }
        return null;
      }, texts);

      if (clicked) {
        if (postWaitSec) await this.I.wait(postWaitSec);
        return "text:" + String(clicked);
      }
    } catch (_) {}
    return null;
  }

  async safeClick({
    selectors = [],
    byText = [],
    postWaitSec = 0.5,
    label = "safeClick"
  } = {}) {
    // 1) CSS-first
    const bySel = await this.tryClickAny(selectors, { postWaitSec });
    if (bySel) return { ok: true, via: bySel, label };

    // 2) Text fallback
    if (byText && byText.length) {
      const byT = await this.clickByText(byText, { postWaitSec: 0.8 });
      if (byT) return { ok: true, via: byT, label };
    }

    return { ok: false, via: null, label };
  }
}

module.exports = { UiEngine };
"use strict";


const { ResilientUi } = require("./ResilientUi");
/**
 * UiEngine:
 * - safeClick: selectors + text fallback
 * - clickByText: DOM iÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§inde text ile en uygun tÃƒÆ’Ã¢â‚¬ÂÃƒâ€šÃ‚Â±klanabilir ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¶ÃƒÆ’Ã¢â‚¬ÂÃƒâ€¦Ã‚Â¸eyi JS ile tÃƒÆ’Ã¢â‚¬ÂÃƒâ€šÃ‚Â±klar
 * - dismissOverlays: project-level dismiss (I.dismissPopups varsa ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§aÃƒÆ’Ã¢â‚¬ÂÃƒâ€¦Ã‚Â¸ÃƒÆ’Ã¢â‚¬ÂÃƒâ€šÃ‚Â±rÃƒÆ’Ã¢â‚¬ÂÃƒâ€šÃ‚Â±r)
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
  // Delegate to resilient layer (retries + overlay dismiss + scroll)
  // Keep postWaitSec compatibility by mapping to pauseMs
  const pauseMs = Math.round(Number(postWaitSec || 0) * 1000);
  return await this.resilient.clickByTexts(texts, { step: "ui:click", pauseMs });
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
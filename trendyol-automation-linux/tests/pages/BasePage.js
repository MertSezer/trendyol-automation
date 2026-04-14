'use strict';

class BasePage {
  /**
   * @param {CodeceptJS.I} I
   */
  constructor(I) {
    this.I = I;
  }

  async dismissPopupsBestEffort() {
    const { I } = this;
    try {
      if (typeof I.dismissPopups === 'function') {
        await I.dismissPopups();
      }
    } catch (_) {}
  }

  async safeClickAny(selectors, waitSec = 0.5) {
    const { I } = this;
    for (const sel of selectors) {
      try {
        const n = await I.grabNumberOfElements(sel);
        if (n > 0) {
          await I.click(sel);
          await I.wait(waitSec);
          return sel;
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * Click by visible text via in-page JS.
   * - scans common clickable nodes
   * - ignores disabled / aria-disabled
   */
  async safeClickByText(texts, waitSec = 0.8) {
    const { I } = this;
    try {
      const clicked = await I.executeScript(function (texts) {
        const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const targets = (texts || []).map(norm);

        const nodes = Array.from(document.querySelectorAll(
          'button, a, div[role="button"], span[role="button"]'
        ));

        for (const el of nodes) {
          const txt = norm(el.innerText || el.textContent);
          if (!txt) continue;
          if (!targets.some(t => t && txt.includes(t))) continue;

          if (el.disabled) continue;
          const ariaDisabled = (el.getAttribute && el.getAttribute('aria-disabled')) || '';
          if (String(ariaDisabled).toLowerCase() === 'true') continue;

          try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
          try { el.click(); return txt; } catch (_) {}
        }
        return null;
      }, texts);

      if (clicked) {
        await I.wait(waitSec);
        return 'text:' + String(clicked);
      }
    } catch (_) {}
    return null;
  }
}

module.exports = BasePage;

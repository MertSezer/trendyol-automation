'use strict';

module.exports = function() {
  return actor({

    /**
     * Dismiss cookie/consent popups safely (never throws).
     */
    async dismissPopups() {
      const selectors = [
        '#onetrust-accept-btn-handler',
        '.onetrust-close-btn-handler',
        '[data-testid*=cookie]',
        '[data-testid*=consent]',
        '.cookie',
        '.consent',
        'button[id*=accept]',
        'button[class*=accept]'
      ];

      for (const sel of selectors) {
        try {
          // Do NOT waitForVisible (can throw / create non-terminated errors)
          const count = await this.grabNumberOfElements(sel);
          if (count > 0) {
            // try click; if overlay blocks, ignore
            await this.click(sel);
            await this.wait(0.2);
          }
        } catch (e) {
          // ignore always
        }
      }
    }

  });
};

const base = require('./codecept.conf.js');
const cfg = base.config || base;

// Ensure helpers object exists
cfg.helpers = cfg.helpers || {};

module.exports = {
  ...cfg,
  helpers: {
    ...cfg.helpers,
    WebDriver: {
      // keep any existing WebDriver options if present
      ...(cfg.helpers.WebDriver || {}),
      host: process.env.SELENIUM_HOST || 'localhost',
      port: Number(process.env.SELENIUM_PORT || 4444),
      url: process.env.BASE_URL || 'https://www.trendyol.com',
      browser: 'chrome',
      restart: true,
      windowSize: '1280x900',
      smartWait: 10000,
      waitForTimeout: 20000,
      timeouts: { script: 60000, 'page load': 60000 },

      // CI-safe W3C capabilities
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--headless=new',
            '--remote-debugging-pipe',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      }
    }
  }
};


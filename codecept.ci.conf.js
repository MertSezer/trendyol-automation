const base = require('./codecept.conf.js');
const cfg = base.config || base;

module.exports = {
  ...cfg,
  helpers: {
    ...(cfg.helpers || {}),
    WebDriver: {
      // Remote Selenium settings
      url: process.env.BASE_URL || 'https://www.trendyol.com',
      host: process.env.SELENIUM_HOST || 'localhost',
      port: Number(process.env.SELENIUM_PORT || 4444),
      path: process.env.SELENIUM_PATH || '/',   // IMPORTANT for Selenium 4
      browser: 'chrome',
      restart: true,
      windowSize: '1280x900',
      smartWait: 10000,
      waitForTimeout: 30000,
      timeouts: { script: 90000, 'page load': 90000 },

      // Clean W3C capabilities (no classic/bidi/websocket enforcement)
      capabilities: {
        browserName: 'chrome',
        platformName: 'LINUX',
        acceptInsecureCerts: true,
        pageLoadStrategy: 'eager',
        'goog:chromeOptions': {
          args: [
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--remote-debugging-pipe',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      }
    }
  }
};

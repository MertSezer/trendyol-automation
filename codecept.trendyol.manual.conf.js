exports.config = {
  tests: './tests/trendyol/manual_policy_probe_test.js',
  output: './output',
  helpers: {
    Playwright: {
      url: 'https://www.trendyol.com',
      browser: 'chromium',
      show: true,
      restart: 'session',
      keepBrowserState: true,
      keepCookies: true,
      waitForAction: 500,
      waitForTimeout: 10000,
      getPageTimeout: 30000,
      windowSize: '1440x900',
      fullPageScreenshots: true,
      video: true,
      trace: true,
    },
  },
  plugins: {
    screenshotOnFail: { enabled: true },
  },
  include: {
    I: './steps_file.js',
  },
  name: 'trendyol-manual-policy',
};

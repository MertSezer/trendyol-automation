require('dotenv').config({ override: true });

const runMode = (process.env.RUN_MODE || 'e2e').toLowerCase();

const helpers = {
  CaseReport: {
    require: './helpers/caseReport.js',
    outputDir: './output',
    file: 'case_report.json'
  },
  ReportHelper: {
    require: './helpers/report.js',
    outputDir: './output',
    summaryFile: 'summary.json',
    markdownFile: 'summary.md'
  },
};

if (runMode === 'e2e') {
  helpers.WebDriver = {
    bidiProtocol: false,
    url: process.env.BASE_URL || 'https://www.trendyol.com',
    host: process.env.SELENIUM_HOST || '127.0.0.1',
    port: Number(process.env.SELENIUM_PORT || 4444),
    path: '/',
    browser: 'MicrosoftEdge',
    restart: true,
    windowSize: '1280x900',
    smartWait: 10000,
    waitForTimeout: 15000,
    timeouts: { script: 60000, 'page load': 30000 },

    capabilities: {
      browserName: 'MicrosoftEdge',
      'ms:edgeOptions': {
        binary: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      },
      'wdio:enforceWebDriverClassic': true,
      webSocketUrl: false,
      pageLoadStrategy: 'eager',
      unhandledPromptBehavior: 'ignore'
    }
  };
}

exports.config = {
  tests: process.env.TESTS || './tests/**/*.js',
  output: './output',
  helpers,

  include: {
    I: './steps_file.js',
    ProductPage: './pages/ProductPage.js',
    CartPage: './pages/CartPage.js',
    VariantSelector: './pages/VariantSelector.js'
  },

  plugins: {
    screenshotOnFail: { enabled: true },
    retryFailedStep: { enabled: true },
    tryTo: { enabled: false }
  },

  name: 'trendyol-automation'
};

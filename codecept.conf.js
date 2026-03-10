require('dotenv').config({ override: true });

const runMode = (process.env.RUN_MODE || 'e2e').toLowerCase();

function makeCapabilities(browser) {
  const commonArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
  const b = (browser || '').toLowerCase();

  const common = {
    webSocketUrl: false,
    'wdio:enforceWebDriverClassic': true,
    pageLoadStrategy: 'eager',
    unhandledPromptBehavior: 'ignore',
  };

  if (b === 'edge' || b === 'microsoftedge') {
    return {
      ...common,
      browserName: 'MicrosoftEdge',
      'ms:edgeOptions': { args: commonArgs }
    };
  }

  return {
    ...common,
    browserName: 'chrome',
    'goog:chromeOptions': { args: commonArgs }
  };
}

const browser = process.env.BROWSER || 'edge';

const helpers = {
  CaseReport: { require: './helpers/caseReport.js', outputDir: './output', file: 'case_report.json' },
  ReportHelper: { require: './helpers/report.js', outputDir: './output', summaryFile: 'summary.json', markdownFile: 'summary.md' },
};

if (runMode === 'e2e') {
  helpers.WebDriver = {
    bidiProtocol: false,
    url: process.env.BASE_URL || 'https://www.trendyol.com',
    host: process.env.SELENIUM_HOST || '127.0.0.1',
    port: Number(process.env.SELENIUM_PORT || 4444),
    path: '/',
    browser,
    restart: true,
    windowSize: '1280x900',
    smartWait: 10000,
    waitForTimeout: 15000,
    timeouts: { script: 60000, 'page load': 30000 },
    capabilities: makeCapabilities(browser),
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

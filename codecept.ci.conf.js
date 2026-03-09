require("dotenv").config({ override: true });

const isCI = String(process.env.CI || "").toLowerCase() === "true";
const browser = String(process.env.BROWSER || "chrome").toLowerCase();

function makeCapabilities(browserName) {
  const commonArgs = [
    "--window-size=1366,900",
    "--lang=tr-TR",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ];

  const ciOnlyArgs = [
    "--headless=new",
    "--disable-features=VizDisplayCompositor",
  ];

  const commonPrefs = {
    "intl.accept_languages": "tr-TR,tr,en-US,en",
  };

  const common = {
    acceptInsecureCerts: true,
    pageLoadStrategy: "normal",
  };

  if (browserName === "edge") {
    return {
      ...common,
      browserName: "MicrosoftEdge",
      "ms:edgeOptions": {
        args: [...commonArgs, ...(isCI ? ciOnlyArgs : [])],
        prefs: commonPrefs,
      },
    };
  }

  return {
    ...common,
    browserName: "chrome",
    "goog:chromeOptions": {
      args: [...commonArgs, ...(isCI ? ciOnlyArgs : [])],
      prefs: commonPrefs,
    },
  };
}

exports.config = {
  tests: process.env.TESTS || "./tests/**/*.js",
  output: "./output",

  helpers: {
    CaseReport: {
      require: "./helpers/caseReport.js",
      outputDir: "./output",
      file: "case_report.json",
    },

    ReportHelper: {
      require: "./helpers/report.js",
      outputDir: "./output",
      summaryFile: "summary.json",
    },

    WebDriver: {
      enableBidi: false,
      logLevel: "silent",

      url: process.env.BASE_URL || "https://www.trendyol.com",
      host: process.env.SELENIUM_HOST || "localhost",
      port: Number(process.env.SELENIUM_PORT || 4444),
      path: process.env.SELENIUM_PATH || "/",

      browser,
      restart: true,
      keepBrowserState: false,
      keepCookies: false,

      windowSize: "1366x900",
      smartWait: 5000,
      waitForTimeout: 15000,
      timeouts: {
        script: 90000,
        "page load": 90000,
      },

      connectionRetryCount: 3,
      connectionRetryTimeout: 120000,

      capabilities: makeCapabilities(browser),
    },
  },

  include: {
    I: "./steps_file.js",
    CartPage: "./pages/CartPage.js",
  },

  plugins: {
    screenshotOnFail: { enabled: true },
    retryFailedStep: { enabled: true },
  },

  name: "trendyol-automation-ci",
};

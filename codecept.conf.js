exports.config = {
  output: './output',
  helpers: {
    Playwright: {
      url: 'https://www.imdb.com',
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
      trace: true
    }
  },
  include: {
    I: './steps_file.js'
  },
  mocha: {},
  bootstrap: null,
  timeout: null,
  teardown: null,
  hooks: [],
  gherkin: {
    features: './features/*.feature',
    steps: ['./step_definitions/steps.js']
  },
  plugins: {
    screenshotOnFail: {
      enabled: true
    }
  },
  stepTimeout: 0,
  stepTimeoutOverride: [{
      pattern: 'wait.*',
      timeout: 0
    },
    {
      pattern: 'amOnPage',
      timeout: 0
    }
  ],
  tests: './tests/*_test.js',
  name: 'imdb-windows-live'
}
require('dotenv').config({ override: true });

const isCI = String(process.env.CI || '').toLowerCase() === 'true';

exports.config = {
  tests: process.env.TESTS || './tests/**/*.js',
  output: './output',

  bootstrap: async () => {
    process.on('unhandledRejection', (reason) => {
      const msg = String(reason && (reason.message || reason) || '');
      if (msg.includes('No connection to WebDriver Bidi was established')) return;
      console.error('UnhandledRejection:', reason);
    });
    process.on('uncaughtException', (err) => {
      const msg = String(err && (err.message || err) || '');
      if (msg.includes('No connection to WebDriver Bidi was established')) return;
      throw err;
    });
  },
helpers: {
    CaseReport: { require: './helpers/caseReport.js', outputDir: './output', file: 'case_report.json' },
    ReportHelper: { require: './helpers/report.js', outputDir: './output', summaryFile: 'summary.json' },

    WebDriver: {
      
      
      enableBidi: false,
logLevel: 'silent',
url: process.env.BASE_URL || 'https://www.trendyol.com',
      host: process.env.SELENIUM_HOST || 'localhost',
      port: Number(process.env.SELENIUM_PORT || 4444),
      path: process.env.SELENIUM_PATH || '/',
      browser: 'chrome',
      restart: true,
      windowSize: '1280x900',
      smartWait: 10000,
      waitForTimeout: 30000,
      timeouts: { script: 90000, 'page load': 90000 },

      connectionRetryCount: 3,
      connectionRetryTimeout: 120000,

      capabilities: {
        browserName: 'chrome',
        platformName: 'LINUX',
        acceptInsecureCerts: true,
        
        webSocketUrl: true,
pageLoadStrategy: 'eager',
        
        'se:bidiEnabled': false,
'goog:chromeOptions': {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            
            '--remote-debugging-pipe',...(isCI ? ['--headless=new', '--disable-features=VizDisplayCompositor'] : [])
          ]
        }
      }
    }
  },

  include: {
    I: './steps_file.js',
    CartPage: './pages/CartPage.js'
  },

  plugins: {
    screenshotOnFail: { enabled: true },
    retryFailedStep: { enabled: true }
  },

  name: 'trendyol-automation-ci'
};

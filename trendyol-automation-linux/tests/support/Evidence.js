const fs = require('fs');
const path = require('path');

class Evidence {
  constructor() {
    this.baseDir = path.join(process.cwd(), 'output');
    this.logDir = path.join(this.baseDir, 'logs');
    this.shotDir = path.join(this.baseDir, 'screenshots');
    this.logFile = path.join(this.logDir, 'demo.log');
    this.ensureDirs();
  }

  ensureDirs() {
    fs.mkdirSync(this.baseDir, { recursive: true });
    fs.mkdirSync(this.logDir, { recursive: true });
    fs.mkdirSync(this.shotDir, { recursive: true });
  }

  resetLog() {
    this.ensureDirs();
    fs.writeFileSync(this.logFile, '', 'utf8');
  }

  log(message) {
    this.ensureDirs();
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(this.logFile, line, 'utf8');
    console.log(message);
  }

  async shot(I, name) {
    const safe = name.replace(/[^\w\-]/g, '_');
    await I.saveScreenshot(path.join('screenshots', `${safe}.png`), true);
    this.log(`SCREENSHOT: ${safe}.png`);
  }

  async step(I, name, detail = '') {
    const msg = detail ? `${name} | ${detail}` : name;
    this.log(`STEP: ${msg}`);
    await this.shot(I, name);
  }
}

module.exports = new Evidence();

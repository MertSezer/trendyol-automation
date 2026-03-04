'use strict';

const fs = require('fs');
const path = require('path');

class CaseReport {
  constructor(config) {
    this.outputDir = (config && config.outputDir) || './output';
    this.file = (config && config.file) || 'case_report.json';
    this.entries = [];
  }

  _ensureDir() {
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  add(event, data = {}) {
    this.entries.push({
      ts: new Date().toISOString(),
      event,
      data
    });
  }

  flush() {
    this._ensureDir();
    const p = path.join(this.outputDir, this.file);
    fs.writeFileSync(p, JSON.stringify(this.entries, null, 2), 'utf8');
  }

  // CodeceptJS hooks
  _after() {
    try { this.flush(); } catch (e) {}
  }

  _afterSuite() {
    try { this.flush(); } catch (e) {}
  }

  _afterAll() {
    try { this.flush(); } catch (e) {}
  }
}

module.exports = CaseReport;

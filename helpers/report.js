'use strict';

const fs = require('fs');
const path = require('path');
const { buildRunsFromCaseReport } = require('../src/core/SummaryBuilder');
class ReportHelper {
  constructor(config) {
    this.outputDir = (config && config.outputDir) || './output';
    this.summaryFile = (config && config.summaryFile) || 'summary.json';
    this.markdownFile = (config && config.markdownFile) || 'summary.md';

    this.run = {
      startedAt: null,
      finishedAt: null,
      durationMs: 0,
      passed: 0,
      failed: 0,
      scenarios: []
    };

    this._start = null;
  }

  _ensureDir() {
    fs.mkdirSync(this.outputDir, { recursive: true });
  }


  _augmentWithTimings() {
    // Merge per-URL timings from case_report.json into summary.json (backwards compatible)
    try {
      const ext = buildRunsFromCaseReport(this.outputDir, 'case_report.json');
      if (ext) {
        this.run.runs = ext.runs;
        this.run.totals = ext.totals;
      }
    } catch (_) {}
  }

  _writeJson() {
    this._augmentWithTimings();
    this._ensureDir();
    const p = path.join(this.outputDir, this.summaryFile);
    fs.writeFileSync(p, JSON.stringify(this.run, null, 2), 'utf8');
  }

  _writeMarkdown() {
    this._augmentWithTimings();
    this._ensureDir();
    const p = path.join(this.outputDir, this.markdownFile);

    const lines = [];
    lines.push('# Trendyol Automation Summary');
    lines.push('');
    lines.push('- Started: ' + String(this.run.startedAt));
    lines.push('- Finished: ' + String(this.run.finishedAt));
    lines.push('- Duration: ' + String(this.run.durationMs) + ' ms');
    lines.push('- Passed: ' + String(this.run.passed));
    lines.push('- Failed: ' + String(this.run.failed));
    lines.push('');
    lines.push('## Scenarios');
    lines.push('');

    for (const s of this.run.scenarios) {
      lines.push('- **' + s.title + '** â€” ' + String(s.status).toUpperCase() + ' (' + String(s.durationMs) + ' ms)');
      if (s.error) lines.push('  - Error: ' + String(s.error).slice(0, 300));
      if (s.screenshot) lines.push('  - Screenshot: ' + String(s.screenshot));
    }    // Optional: Per-URL timing table (from this.run.runs)
    if (Array.isArray(this.run.runs) && this.run.runs.length) {
      lines.push('');
      lines.push('## Runs (Per URL Timings)');
      lines.push('');
      lines.push('| # | Status | Total(ms) | Open | Add | Cart | Remove | URL |');
      lines.push('|---:|:------|----------:|-----:|----:|-----:|-------:|:----|');

      for (const r of this.run.runs) {
        const idx = String(r.idx ?? '');
        const st = String(r.status ?? '');
        const total = String(r.totalMs ?? '');
        const open = String(r.openMs ?? '');
        const add = String(r.addMs ?? '');
        const cart = String(r.cartMs ?? '');
        const rem = String(r.removeMs ?? '');
        const url = String(r.url ?? '');
        lines.push('| ' + idx + ' | ' + st + ' | ' + total + ' | ' + open + ' | ' + add + ' | ' + cart + ' | ' + rem + ' | ' + url + ' |');
      }
    }

    fs.writeFileSync(p, lines.join('\n'), 'utf8');}

  _before() {
    if (!this.run.startedAt) this.run.startedAt = new Date().toISOString();
    this._start = Date.now();
  }

  _passed(test) {
    const durationMs = Date.now() - (this._start || Date.now());
    this.run.passed += 1;

    const title = (test && test.title) ? test.title : 'unknown';
    this.run.scenarios.push({
      title,
      status: 'passed',
      durationMs
    });
  }

  _failed(test) {
    const durationMs = Date.now() - (this._start || Date.now());
    this.run.failed += 1;

    const title = (test && test.title) ? test.title : 'unknown';
    const safe = title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
    const screenshot = path.join(this.outputDir, safe + '.failed.png');

    const err = (test && test.err) ? (test.err.message || String(test.err)) : 'unknown error';

    this.run.scenarios.push({
      title,
      status: 'failed',
      durationMs,
      screenshot,
      error: err
    });
  }

  _finishTest() {
    if (!this.run.finishedAt) this.run.finishedAt = new Date().toISOString();
    this.run.durationMs = this.run.startedAt ? (Date.now() - Date.parse(this.run.startedAt)) : 0;
    this._writeJson();
    this._writeMarkdown();
  }

  _after() {
    this._finishTest();
  }

  _afterSuite() {
    this._finishTest();
  }

  _afterAll() {
    this.run.finishedAt = new Date().toISOString();
    this.run.durationMs = this.run.startedAt ? (Date.now() - Date.parse(this.run.startedAt)) : 0;
    this._writeJson();
    this._writeMarkdown();
  }
}

module.exports = ReportHelper;

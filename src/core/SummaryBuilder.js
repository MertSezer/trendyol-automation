"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Builds extended summary data from case_report.json.
 * Safe: if case_report.json missing or malformed, returns null.
 */
function buildRunsFromCaseReport(outputDir = "output", caseFile = "case_report.json") {
  try {
    const p = path.join(process.cwd(), outputDir, caseFile);
    if (!fs.existsSync(p)) return null;

    const raw = fs.readFileSync(p, "utf-8");
    const data = JSON.parse(raw);

    const events = Array.isArray(data.events) ? data.events : [];
    const runs = events
      .filter(e => e && e.type === "timing:url")
      .map(e => ({
        idx: e.idx,
        url: e.url,
        status: e.status,
        openMs: e.openMs,
        addMs: e.addMs,
        cartMs: e.cartMs,
        removeMs: e.removeMs,
        totalMs: e.totalMs,
      }))
      .sort((a, b) => (a.idx || 0) - (b.idx || 0));

    const totals = runs.reduce((acc, r) => {
      acc.totalMs += Number(r.totalMs || 0);
      acc.openMs += Number(r.openMs || 0);
      acc.addMs += Number(r.addMs || 0);
      acc.cartMs += Number(r.cartMs || 0);
      acc.removeMs += Number(r.removeMs || 0);
      acc.count += 1;
      acc.statusCounts[r.status || "unknown"] = (acc.statusCounts[r.status || "unknown"] || 0) + 1;
      return acc;
    }, { totalMs: 0, openMs: 0, addMs: 0, cartMs: 0, removeMs: 0, count: 0, statusCounts: {} });

    return { runs, totals };
  } catch (_) {
    return null;
  }
}

module.exports = { buildRunsFromCaseReport };
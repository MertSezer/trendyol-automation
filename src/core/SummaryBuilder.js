"use strict";

const fs = require("fs");
const path = require("path");

function asNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function pickArray(obj, keys) {
  for (const k of keys) {
    const v = obj && obj[k];
    if (Array.isArray(v)) return v;
  }
  return null;
}

/**
 * Builds extended summary data from case_report.json.
 * Supports:
 *  - root array: [ {event, data}, ... ]
 *  - object with events/items/entries/log/records arrays
 */
function buildRunsFromCaseReport(outputDir = "output", caseFile = "case_report.json") {
  try {
    const p = path.join(process.cwd(), outputDir, caseFile);
    if (!fs.existsSync(p)) return null;

    const raw = fs.readFileSync(p, "utf-8");
    const data = JSON.parse(raw);

    // case_report.json can be an array or an object
    const events =
      (Array.isArray(data) ? data : null) ||
      pickArray(data, ["events", "items", "entries", "records", "log"]) ||
      pickArray(data && data.data, ["events", "items", "entries", "records", "log"]) ||
      [];

    if (!Array.isArray(events) || events.length === 0) return null;

    // timing can be stored as {event:'timing:url', data:{...}} or {type:'timing:url', ...}
    const isTimingUrl = (e) => {
      const t = e && (e.event || e.type || e.name || e.kind);
      return String(t || "") === "timing:url";
    };

    const runs = events
      .filter(isTimingUrl)
      .map((e) => {
        const d = e.data || e.value || e.payload || {};
        return {
          idx: d.idx ?? e.idx,
          url: d.url ?? e.url,
          status: d.status ?? e.status,
          openMs: d.openMs ?? e.openMs,
          addMs: d.addMs ?? e.addMs,
          cartMs: d.cartMs ?? e.cartMs,
          removeMs: d.removeMs ?? e.removeMs,
          totalMs: d.totalMs ?? e.totalMs,
        };
      })
      .sort((a, b) => asNumber(a.idx) - asNumber(b.idx));

    if (!runs.length) return null;

    const totals = runs.reduce((acc, r) => {
      acc.totalMs += asNumber(r.totalMs);
      acc.openMs += asNumber(r.openMs);
      acc.addMs += asNumber(r.addMs);
      acc.cartMs += asNumber(r.cartMs);
      acc.removeMs += asNumber(r.removeMs);
      acc.count += 1;
      const st = r.status || "unknown";
      acc.statusCounts[st] = (acc.statusCounts[st] || 0) + 1;
      return acc;
    }, { totalMs: 0, openMs: 0, addMs: 0, cartMs: 0, removeMs: 0, count: 0, statusCounts: {} });

    return { runs, totals };
  } catch (_) {
    return null;
  }
}

module.exports = { buildRunsFromCaseReport };
"use strict";

const { container } = require("codeceptjs");
const { readProducts } = require("../../src/core/Data");
const { TopColorsAddRemoveFlow } = require("../../src/flows/TopColorsAddRemoveFlow");

Feature("Trendyol - Top Colors Add/Remove Demo (POM)");

function getCaseReport() {
  try { return container.helpers("CaseReport"); } catch (e) { return null; }
}

Scenario("Top colors -> select -> add to cart -> remove (per URL)", async ({ I }) => {
  const urls = readProducts("products.txt");
  if (!urls.length) {
    I.say("No URLs found in products.txt");
    return;
  }

  const topN = Number(process.env.TOP_COLORS || 3);
  const caseReport = getCaseReport();
  I.say("CaseReport=" + (caseReport ? "OK" : "NULL"));
  I.say("TOP_COLORS=" + topN);

  if (caseReport) caseReport.add("multi:start", { count: urls.length, topN });

  const flow = new TopColorsAddRemoveFlow({ I, caseReport, topN });

  let opened = 0, added = 0, warn = 0, skip = 0;
  for (let i = 0; i < urls.length; i++) {
    const r = await flow.runOneUrl({ url: urls[i], idx: i + 1, total: urls.length });
    opened += r.opened || 0;
    added += r.added || 0;
    warn += r.warn || 0;
    skip += r.skip || 0;
  }

  if (caseReport) caseReport.add("multi:done", { ok: true, counters: { opened, added, warn, skip } });
});
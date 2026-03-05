"use strict";

const { container } = require("codeceptjs");
const { readProducts } = require("../../src/core/Data");
const { AddRemoveFlow } = require("../../src/flows/AddRemoveFlow");

Feature("Trendyol - Multi URL Enterprise Demo (POM)");

function getCaseReport() {
  try { return container.helpers("CaseReport"); } catch (e) { return null; }
}

Scenario("Products list -> open -> add-to-cart -> cart -> remove -> summary (POM)", async ({ I }) => {
  const urls = readProducts("products.txt");
  if (!urls.length) {
    I.say("No URLs found in products.txt");
    return;
  }

  const caseReport = getCaseReport();
  I.say("CaseReport=" + (caseReport ? "OK" : "NULL"));

  let opened = 0, added = 0, skip = 0, warn = 0;

  I.say("URL count=" + urls.length);
  if (caseReport) caseReport.add("multi:start", { count: urls.length });

  const flow = new AddRemoveFlow({ I, caseReport });

  for (let i = 0; i < urls.length; i++) {
    const res = await flow.runOne({ url: urls[i], idx: i + 1, total: urls.length });
    opened += res.opened || 0;
    added  += res.added  || 0;
    skip   += res.skip   || 0;
    warn   += res.warn   || 0;
  

    if (String(process.env.DEMO_MODE || "") === "1" && (res.status === "ok" || (res.added || 0) > 0)) {
      I.say("DEMO_MODE=1 -> first success, stopping early");
      break;
    }}

    // If nothing was actually executed (all skipped), fail fast (enterprise signal)
  if (opened > 0 && added === 0 && skip === opened) {
    throw new Error("All URLs were skipped (blocked/404/no-variants). No real E2E executed.");
  }

if (caseReport) caseReport.add("multi:done", { ok: true, counters: { opened, added, skip, warn } });
});
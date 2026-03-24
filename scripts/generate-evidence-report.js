"use strict";

const fs = require("fs");
const path = require("path");

function main() {
  const runDirArg = process.argv[2];
  if (!runDirArg) {
    throw new Error("Run directory argument is required.");
  }

  const runDir = path.resolve(runDirArg);
  const indexPath = path.join(runDir, "index.json");

  if (!fs.existsSync(indexPath)) {
    throw new Error(`index.json not found: ${indexPath}`);
  }

  const indexData = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const html = buildHtml(indexData);

  const outPath = path.join(runDir, "report.html");
  fs.writeFileSync(outPath, html, "utf8");

  console.log(`Report generated: ${outPath}`);
}

function buildHtml(indexData) {
  const steps = indexData.steps || [];

  const stepsHtml = steps.map((step) => {
    const fullShot = step.files?.fullPageScreenshot
      ? `<img src="${escapeHtml(step.files.fullPageScreenshot)}" alt="${escapeHtml(step.stepId)}" />`
      : `<div class="muted">No screenshot</div>`;

    const stateLink = step.files?.state
      ? `<a href="${escapeHtml(step.files.state)}" target="_blank">state.json</a>`
      : `<span class="muted">state.json missing</span>`;

    const noteLink = step.files?.note
      ? `<a href="${escapeHtml(step.files.note)}" target="_blank">note.txt</a>`
      : `<span class="muted">note.txt missing</span>`;

    const bodyLink = step.files?.bodyExcerpt
      ? `<a href="${escapeHtml(step.files.bodyExcerpt)}" target="_blank">body_excerpt.txt</a>`
      : `<span class="muted">body_excerpt.txt missing</span>`;

    const badgeClass = step.status === "ok" ? "ok" : (step.status === "failed" ? "failed" : "started");

    return `
      <section class="step">
        <div class="step-header">
          <div>
            <h2>${escapeHtml(step.stepNo)} - ${escapeHtml(step.stepName)}</h2>
            <div class="meta">${escapeHtml(step.createdAt || "")}</div>
          </div>
          <div class="badge ${badgeClass}">${escapeHtml(step.status || "unknown")}</div>
        </div>

        <div class="grid">
          <div class="preview">${fullShot}</div>
          <div class="details">
            <pre>${escapeHtml(JSON.stringify(step.meta || {}, null, 2))}</pre>
            <div class="links">${stateLink} | ${noteLink} | ${bodyLink}</div>
          </div>
        </div>
      </section>
    `;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Evidence Report - ${escapeHtml(indexData.runId || "run")}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f6f7f9; color: #222; }
    .top, .step { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    h1, h2 { margin-top: 0; }
    .grid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 20px; }
    .preview img { max-width: 100%; border: 1px solid #ccc; border-radius: 4px; }
    .step-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; }
    .meta { color: #666; font-size: 13px; }
    .badge { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .badge.ok { background: #e8f7e8; color: #1f6f1f; }
    .badge.failed { background: #fdeaea; color: #a12626; }
    .badge.started { background: #eef3ff; color: #2f5fb3; }
    pre { white-space: pre-wrap; word-break: break-word; background: #fafafa; border: 1px solid #eee; padding: 12px; font-size: 12px; line-height: 1.45; border-radius: 4px; }
    .links { margin-top: 10px; }
    a { text-decoration: none; }
    .muted { color: #777; }
  
  
    .overall-result-card {
      border: 2px solid #d1d5db;
      border-radius: 14px;
      padding: 18px 20px;
      margin: 0 0 18px 0;
      background: #f9fafb;
    }
    .overall-result-card.pass {
      border-color: #16a34a;
      background: #f0fdf4;
    }
    .overall-result-card.warn {
      border-color: #d97706;
      background: #fffbeb;
    }
    .overall-result-title {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 10px;
    }
    .overall-result-items {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
    }

.verdict-grid { display: grid; gap: 12px; }
  .verdict-row {
    display: grid;
    grid-template-columns: 220px 120px 1fr;
    gap: 12px;
    align-items: center;
    padding: 10px 0;
    border-top: 1px solid #e5e7eb;
  }
  .verdict-row:first-child { border-top: 0; }
  .verdict-label { font-weight: 600; }
  .verdict-note { color: #4b5563; }
  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    width: fit-content;
  }
  .badge-ok { background: #dcfce7; color: #166534; }
  .badge-bad { background: #fee2e2; color: #991b1b; }
  .badge-warn { background: #fef3c7; color: #92400e; }
</style>
</head>
<body>
    ${buildOverallResultBanner(indexData)}
    ${buildScenarioVerdict(indexData)}
  <section class="top">
    <h1>Evidence Report</h1>
    <div><strong>Run ID:</strong> ${escapeHtml(indexData.runId || "")}</div>
    <div><strong>Run Label:</strong> ${escapeHtml(indexData.runLabel || "")}</div>
    <div><strong>Generated At:</strong> ${escapeHtml(indexData.generatedAt || "")}</div>
    <div><strong>Total Steps:</strong> ${escapeHtml(String(steps.length))}</div>
    <pre>${escapeHtml(JSON.stringify(indexData.summary || {}, null, 2))}</pre>
  </section>

  ${stepsHtml}
</body>
</html>`;
}



function buildOverallResultBanner(run) {
  const steps = Array.isArray(run.steps) ? run.steps : [];
  const finalMeta = run.finalMeta || {};

  const cartAfterAddSteps = steps.filter(
    (x) => String(x.stepName || "").includes("cart_after_add")
  );
  const removeSteps = steps.filter(
    (x) => String(x.stepName || "").includes("after_remove_oldest")
  );

  const allExtras = steps.map((x) => x.extra || x.meta?.extra || x.meta || {});
  const allSnapshots = steps.map((x) => x.cartSnapshot || x.meta?.cartSnapshot || x.meta || {});

  const cartLimit =
    Number(finalMeta.finalCartLimit) ||
    Number(
      allExtras.find((e) => Number.isFinite(Number(e.cartLimit)))?.cartLimit || 0
    );

  const blockedByProductLimit = allExtras.some((e) => {
    const addResult = e.addResult || {};
    return addResult.mode === "blocked_by_product_limit";
  });

  const fifoPass = removeSteps.length > 0;

  const cartCounts = allSnapshots
    .map((x) => Number(x.cartCount))
    .filter((x) => Number.isFinite(x));

  const finalCartCount =
    cartCounts.length > 0 ? cartCounts[cartCounts.length - 1] : 0;

  const maxObservedCart =
    cartCounts.length > 0 ? Math.max(...cartCounts) : 0;

  const perProductPass = blockedByProductLimit === true;
  const cartLimitPass = cartLimit > 0 ? finalCartCount <= cartLimit : null;

  const overallPass =
    perProductPass === true &&
    cartLimitPass === true &&
    fifoPass === true;

  const overallText = overallPass ? "PASS" : "CHECK";
  const overallClass = overallPass ? "pass" : "warn";

  return `
    <section class="overall-result-card ${overallClass}">
      <div class="overall-result-title">OVERALL RESULT: ${overallText}</div>
      <div class="overall-result-items">
        <div>Per-product limit: ${perProductPass ? "PASS" : "CHECK"}</div>
        <div>Cart limit: ${cartLimitPass ? "PASS" : "CHECK"}</div>
        <div>FIFO removal: ${fifoPass ? "PASS" : "CHECK"}</div>
      </div>
      <div class="overall-result-items" style="margin-top:8px;font-size:14px;font-weight:500;">
        <div>Final cart count: ${finalCartCount}</div>
        <div>Max observed cart: ${maxObservedCart}</div>
        <div>Configured cart limit: ${cartLimit || "-"}</div>
      </div>
    </section>
  `;
}


function buildScenarioVerdict(run) {
  const steps = Array.isArray(run.steps) ? run.steps : [];
  const finalMeta = run.finalMeta || {};

  const basketAfterAdd = steps.filter((x) =>
    String(x.stepName || "").includes("cart_after_add")
  );
  const removeSteps = steps.filter((x) =>
    String(x.stepName || "").includes("after_remove_oldest")
  );

  const allExtras = steps.map((x) => x.extra || x.meta?.extra || x.meta || {});
  const allSnapshots = steps.map((x) => x.cartSnapshot || x.meta?.cartSnapshot || x.meta || {});

  const blockedByProductLimit = allExtras.some((e) => {
    const addResult = e.addResult || {};
    return addResult.mode === "blocked_by_product_limit";
  });

  const cartCounts = allSnapshots
    .map((x) => Number(x.cartCount))
    .filter((x) => Number.isFinite(x));

  const finalCartCount =
    cartCounts.length > 0 ? cartCounts[cartCounts.length - 1] : 0;

  const observedCartLimit = cartCounts.length > 0 ? Math.max(...cartCounts) : 0;

  const declaredCartLimit =
    Number(finalMeta.finalCartLimit || 0) ||
    Number(
      (allExtras.find((e) => Number.isFinite(Number(e.cartLimit))) || {}).cartLimit || 0
    );

  const cartLimitPassed =
    declaredCartLimit > 0 ? finalCartCount <= declaredCartLimit : null;

  const fifoPassed = removeSteps.length > 0
    ? removeSteps.every((x) => {
        const e = x.extra || {};
        const r = e.removeResult || {};
        return r && r.ok === true;
      })
    : null;

  const perProductPassed = blockedByProductLimit ? true : null;

  const badge = (label, ok, note = "") => {
    let cls = "badge badge-warn";
    let text = "UNKNOWN";

    if (ok === true) {
      cls = "badge badge-ok";
      text = "PASSED";
    } else if (ok === false) {
      cls = "badge badge-bad";
      text = "FAILED";
    }

    return `
      <div class="verdict-row">
        <div class="verdict-label">${escapeHtml(label)}</div>
        <div class="${cls}">${text}</div>
        <div class="verdict-note">${escapeHtml(note)}</div>
      </div>
    `;
  };

  return `
    <section class="card">
      <h2>Scenario Verdict</h2>
      <div class="verdict-grid">
        ${badge(
          "Per-product limit",
          perProductPassed,
          blockedByProductLimit
            ? "Blocked attempt observed at product limit."
            : "No blocked attempt observed in this run."
        )}
        ${badge(
          "Cart limit",
          cartLimitPassed,
          declaredCartLimit
            ? `Final cart count: ${finalCartCount}, observed max: ${observedCartLimit}, expected max final: ${declaredCartLimit}`
            : `Final cart count: ${finalCartCount}, observed max: ${observedCartLimit}`
        )}
        ${badge(
          "FIFO removal",
          fifoPassed,
          removeSteps.length
            ? `Remove-oldest steps: ${removeSteps.length}`
            : "No remove-oldest step observed."
        )}
      </div>
    </section>
  `;
}


function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

main();

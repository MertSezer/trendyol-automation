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
  </style>
</head>
<body>
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

main();

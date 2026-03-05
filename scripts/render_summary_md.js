"use strict";

const fs = require("fs");
const path = require("path");

function shortUrl(u) {
  try {
    const x = new URL(u);
    const parts = x.pathname.split("/").filter(Boolean);
    const tail = parts.slice(-2).join("/");
    return `${x.hostname}/${tail || parts.slice(-1)[0] || ""}`;
  } catch {
    return u;
  }
}

/**
 * Render a human-readable summary.md from output/case_report.json.
 * - Groups by URL idx
 * - Extracts ok/skip and reason
 * - Shows timings
 */
function main() {
  const outDir = path.resolve(process.cwd(), "output");
  const casePath = path.join(outDir, "case_report.json");
  if (!fs.existsSync(casePath)) {
    console.error("case_report.json not found:", casePath);
    process.exit(0);
  }

  const items = JSON.parse(fs.readFileSync(casePath, "utf8"));
  const perUrl = new Map();

  for (const it of items) {
    const e = it.event;
    const d = it.data || {};
    const idx = d.idx;
    if (!idx) continue;

    if (!perUrl.has(idx)) {
      perUrl.set(idx, {
        idx,
        url: d.url || "",
        status: "unknown",
        reason: "",
        title: "",
        totalMs: "",
        openMs: "",
        addMs: "",
        cartMs: "",
        removeMs: "",
      });
    }
    const row = perUrl.get(idx);

    if (d.url) row.url = d.url;

    if (e === "url:skip") {
      row.status = "SKIP";
      row.reason = d.reason || row.reason;
      row.title = d.title || row.title;
    }
    if (e === "url:ok") {
      row.status = "OK";
      row.title = d.title || row.title;
      if (d.timings) {
        row.openMs = d.timings.openMs ?? row.openMs;
        row.addMs = d.timings.addMs ?? row.addMs;
        row.cartMs = d.timings.cartMs ?? row.cartMs;
        row.removeMs = d.timings.removeMs ?? row.removeMs;
        row.totalMs = d.timings.totalMs ?? row.totalMs;
      } else {
        row.totalMs = d.totalMs ?? row.totalMs;
      }
    }
    if (e === "timing:url") {
      row.openMs = d.openMs ?? row.openMs;
      row.addMs = d.addMs ?? row.addMs;
      row.cartMs = d.cartMs ?? row.cartMs;
      row.removeMs = d.removeMs ?? row.removeMs;
      row.totalMs = d.totalMs ?? row.totalMs;
      if (d.status === "skip" && row.status === "unknown") row.status = "SKIP";
      if (d.status === "ok" && row.status === "unknown") row.status = "OK";
    }
  }

  const rows = Array.from(perUrl.values()).sort((a, b) => a.idx - b.idx);

  // Totals
  let okCount = 0, skipCount = 0;
  const okTotals = [];
  for (const r of rows) {
    if (r.status === "OK") {
      okCount++;
      const n = Number(r.totalMs);
      if (Number.isFinite(n)) okTotals.push(n);
    } else if (r.status === "SKIP") {
      skipCount++;
    }
  }
  const avgTotalMs = okTotals.length ? Math.round(okTotals.reduce((a, b) => a + b, 0) / okTotals.length) : "";

  const now = new Date().toISOString();
  let md = `# Test Summary\n\n`;
  md += `Generated: \`${now}\`\n\n`;
  md += `**OK:** ${okCount} | **SKIP:** ${skipCount}`;
  if (avgTotalMs !== "") md += ` | **Avg totalMs (OK):** ${avgTotalMs}`;
  md += `\n\n`;

  md += `| # | Status | totalMs | openMs | addMs | cartMs | removeMs | reason | url |\n`;
  md += `|---:|:------|-------:|------:|-----:|------:|--------:|:------|:----|\n`;

  for (const r of rows) {
    const reason = (r.status === "SKIP" ? (r.reason || "skipped") : "");
    const safeUrl = r.url ? shortUrl(r.url).replace(/\|/g, "\\|") : "";
    md += `| ${r.idx} | ${r.status} | ${r.totalMs ?? ""} | ${r.openMs ?? ""} | ${r.addMs ?? ""} | ${r.cartMs ?? ""} | ${r.removeMs ?? ""} | ${reason.replace(/\|/g, "\\|")} | ${safeUrl} |\n`;
  }

  md += `\n## Notes\n\n`;
  md += `- SKIP reasons include: \`blocked/anti-bot\`, \`page 404/not-found\`, \`no colors discovered\`.\n`;
  md += `- This report is derived from \`output/case_report.json\`.\n`;

  const mdPath = path.join(outDir, "summary.md");
  fs.writeFileSync(mdPath, md, "utf8");
  console.log("Wrote:", mdPath);
}

main();

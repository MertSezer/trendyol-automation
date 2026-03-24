"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = process.cwd();
const DEMO_RUNS_DIR = path.join(ROOT, "output", "demo-runs");

let currentRun = {
  status: "idle",
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  log: [],
  pid: null,
};

app.use(express.urlencoded({ extended: false }));
app.use("/demo-runs", express.static(DEMO_RUNS_DIR));

app.get("/", (req, res) => {
  const runs = getRuns();
  const latest = runs[0] || null;
  const latestIndex = latest ? readIndexSafe(latest.fullPath) : null;

  res.send(renderHomePage({
    runs,
    latest,
    latestIndex,
    currentRun,
  }));
});

app.get("/api/runs", (req, res) => {
  const runs = getRuns().map((run) => ({
    name: run.name,
    reportUrl: fs.existsSync(path.join(run.fullPath, "report.html"))
      ? `/demo-runs/${encodeURIComponent(run.name)}/report.html`
      : null,
    indexUrl: fs.existsSync(path.join(run.fullPath, "index.json"))
      ? `/demo-runs/${encodeURIComponent(run.name)}/index.json`
      : null,
  }));

  res.json({ runs, currentRun });
});

app.get("/api/status", (req, res) => {
  res.json(currentRun);
});

app.post("/start-demo", (req, res) => {
  if (currentRun.status === "running") {
    return res.redirect("/");
  }

  startDemoProcess();
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Demo panel running: http://localhost:${PORT}`);
});

function startDemoProcess() {
  currentRun = {
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    log: [],
    pid: null,
  };

  const child = spawn("bash", ["-lc", "export BROWSER=firefox && ./scripts/demo-fifo-evidence.sh"], {
    cwd: ROOT,
    env: process.env,
  });

  currentRun.pid = child.pid;

  child.stdout.on("data", (buf) => appendLog(buf.toString()));
  child.stderr.on("data", (buf) => appendLog(buf.toString()));

  child.on("close", (code) => {
    currentRun.status = code === 0 ? "success" : "failed";
    currentRun.exitCode = code;
    currentRun.finishedAt = new Date().toISOString();

    const latestRun = getRuns()[0];
    if (latestRun) {
      const reportPath = path.join(latestRun.fullPath, "report.html");
      if (!fs.existsSync(reportPath)) {
        tryGenerateReport(latestRun.fullPath);
      }
    }
  });

  child.on("error", (err) => {
    appendLog(`PROCESS ERROR: ${err.message}`);
    currentRun.status = "failed";
    currentRun.finishedAt = new Date().toISOString();
  });
}

function appendLog(text) {
  const lines = String(text || "").split(/\r?\n/).filter(Boolean);
  currentRun.log.push(...lines);
  if (currentRun.log.length > 200) {
    currentRun.log = currentRun.log.slice(-200);
  }
}

function tryGenerateReport(runDir) {
  try {
    const child = spawn("node", ["./scripts/generate-evidence-report.js", runDir], {
      cwd: ROOT,
      env: process.env,
      stdio: "ignore",
    });

    child.on("error", () => {});
  } catch (_) {}
}

function getRuns() {
  if (!fs.existsSync(DEMO_RUNS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(DEMO_RUNS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const fullPath = path.join(DEMO_RUNS_DIR, d.name);
      const stat = fs.statSync(fullPath);
      return {
        name: d.name,
        fullPath,
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function readIndexSafe(runPath) {
  try {
    const p = path.join(runPath, "index.json");
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return null;
  }
}

function renderHomePage({ runs, latest, latestIndex, currentRun }) {
  const latestSummary = latestIndex?.summary || {};
  const latestSteps = latestIndex?.steps || [];
  const latestReportUrl = latest ? `/demo-runs/${encodeURIComponent(latest.name)}/report.html` : null;

  const stepsHtml = latestSteps.slice(0, 8).map((step) => {
    const img = step.files?.fullPageScreenshot
      ? `/demo-runs/${encodeURIComponent(latest.name)}/${step.files.fullPageScreenshot}`
      : null;

    return `
      <div class="step-card">
        <div class="step-top">
          <div>
            <h3>${escapeHtml(step.stepNo)} - ${escapeHtml(step.stepName)}</h3>
            <div class="muted">${escapeHtml(step.createdAt || "")}</div>
          </div>
          <span class="badge ${escapeHtml(step.status || "unknown")}">${escapeHtml(step.status || "unknown")}</span>
        </div>
        ${img ? `<img src="${img}" alt="${escapeHtml(step.stepId)}" />` : `<div class="muted">No image</div>`}
      </div>
    `;
  }).join("\n");

  const runsHtml = runs.map((run) => {
    const reportLink = fs.existsSync(path.join(run.fullPath, "report.html"))
      ? `/demo-runs/${encodeURIComponent(run.name)}/report.html`
      : null;

    return `
      <tr>
        <td>${escapeHtml(run.name)}</td>
        <td>${reportLink ? `<a href="${reportLink}" target="_blank">Open report</a>` : `<span class="muted">No report</span>`}</td>
        <td><a href="/demo-runs/${encodeURIComponent(run.name)}/index.json" target="_blank">index.json</a></td>
      </tr>
    `;
  }).join("\n");

  const runLog = (currentRun.log || []).slice(-40).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Trendyol Demo Panel</title>
  <meta http-equiv="refresh" content="5" />
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f6f7fb; color: #222; }
    .box { background: white; border: 1px solid #ddd; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
    h1, h2, h3 { margin-top: 0; }
    .muted { color: #666; font-size: 13px; }
    .step-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .step-card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    .step-card img { max-width: 100%; border: 1px solid #ccc; border-radius: 6px; margin-top: 10px; }
    .step-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .badge { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .badge.ok, .badge.success { background: #e8f7e8; color: #1d6d1d; }
    .badge.failed { background: #fde8e8; color: #a22; }
    .badge.started, .badge.running { background: #eef3ff; color: #2d5db3; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
    a { text-decoration: none; }
    pre { white-space: pre-wrap; word-break: break-word; background: #fafafa; border: 1px solid #eee; padding: 12px; border-radius: 6px; max-height: 380px; overflow: auto; }
    button { padding: 10px 16px; border: 1px solid #ccc; border-radius: 8px; background: #fff; cursor: pointer; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Trendyol Demo Panel</h1>
    <div class="muted">Evidence + report + demo tetikleme paneli</div>
  </div>

  <div class="box">
    <h2>Demo Control</h2>
    <div><strong>Status:</strong> <span class="badge ${escapeHtml(currentRun.status)}">${escapeHtml(currentRun.status)}</span></div>
    <div class="muted">Started: ${escapeHtml(currentRun.startedAt || "-")}</div>
    <div class="muted">Finished: ${escapeHtml(currentRun.finishedAt || "-")}</div>
    <div class="muted">PID: ${escapeHtml(String(currentRun.pid || "-"))}</div>
    <div class="muted">Exit Code: ${escapeHtml(String(currentRun.exitCode ?? "-"))}</div>
    <form method="post" action="/start-demo" style="margin-top:12px;">
      <button type="submit" ${currentRun.status === "running" ? "disabled" : ""}>Start Demo</button>
    </form>
    <pre>${escapeHtml(runLog || "No logs yet.")}</pre>
  </div>

  <div class="box">
    <h2>Latest Run</h2>
    ${
      latest
        ? `
          <div><strong>Run:</strong> ${escapeHtml(latest.name)}</div>
          <div style="margin-top:10px;">
            ${latestReportUrl ? `<a href="${latestReportUrl}" target="_blank">Open latest report</a>` : `<span class="muted">No report</span>`}
            &nbsp;|&nbsp;
            <a href="/demo-runs/${encodeURIComponent(latest.name)}/index.json" target="_blank">Open index.json</a>
          </div>
          <pre>${escapeHtml(JSON.stringify(latestSummary, null, 2))}</pre>
        `
        : `<div class="muted">No run found.</div>`
    }
  </div>

  <div class="box">
    <h2>Latest Steps Preview</h2>
    <div class="step-grid">
      ${stepsHtml || '<div class="muted">No steps found.</div>'}
    </div>
  </div>

  <div class="box">
    <h2>All Runs</h2>
    <table>
      <thead>
        <tr>
          <th>Run</th>
          <th>Report</th>
          <th>Index</th>
        </tr>
      </thead>
      <tbody>
        ${runsHtml || '<tr><td colspan="3">No runs</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

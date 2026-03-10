"use strict";

const fs = require("fs");
const path = require("path");

const MIN_OK = parseInt(process.env.QUALITY_GATE_MIN_OK || "1", 10);
const MAX_SKIP_PCT = parseInt(process.env.QUALITY_GATE_MAX_SKIP_PCT || "80", 10);

const candidatePaths = [
  path.resolve("output/case_report.multi.json"),
  path.resolve("output/case_report.json")
];

const casePath = candidatePaths.find((p) => fs.existsSync(p));

if (!casePath) {
  console.error("Quality Gate: no case report found");
  console.error("Checked paths:", candidatePaths);
  process.exit(1);
}

const raw = fs.readFileSync(casePath, "utf8");
const data = JSON.parse(raw);

let ok = 0;
let skip = 0;
let total = 0;

if (Array.isArray(data)) {
  for (const e of data) {
    if (e.event === "url:ok") ok++;
    if (e.event === "url:skip") skip++;
  }
  total = ok + skip;
} else if (data && typeof data === "object") {
  if (data.totals && typeof data.totals === "object") {
    ok = Number(data.totals.ok || 0);
    skip = Number(data.totals.skipped || data.totals.skip || 0);
    total = Number(data.totals.urls || data.totals.total || (ok + skip));
  } else if (Array.isArray(data.events)) {
    for (const e of data.events) {
      if (e.event === "url:ok") ok++;
      if (e.event === "url:skip") skip++;
    }
    total = ok + skip;
  }
}

const skipPct = total ? Math.round((skip / total) * 100) : 0;

console.log("Quality Gate source:", casePath);
console.log("Quality Gate metrics:");
console.log({ ok, skip, total, skipPct });

const outGate = path.resolve("output/quality_gate.json");

try {
  fs.writeFileSync(
    outGate,
    JSON.stringify(
      {
        source: casePath,
        ok,
        skip,
        total,
        skipPct,
        minOk: MIN_OK,
        maxSkipPct: MAX_SKIP_PCT,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );
  console.log("Wrote:", outGate);
} catch (e) {
  console.error(
    "WARN: could not write output/quality_gate.json:",
    e && e.message ? e.message : e
  );
}

if (ok < MIN_OK) {
  console.error(`FAIL: ok (${ok}) < MIN_OK (${MIN_OK})`);
  process.exit(1);
}

if (skipPct > MAX_SKIP_PCT) {
  console.error(`FAIL: skipPct (${skipPct}%) > MAX_SKIP_PCT (${MAX_SKIP_PCT}%)`);
  process.exit(1);
}

console.log("QUALITY_GATE: PASS");
process.exit(0);

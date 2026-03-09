const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2] || path.join("output", "mobivisor_run.json");

function fail(message) {
  console.error(`GATE_FAILED: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Input JSON not found: ${filePath}`);
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (err) {
    fail(`Could not parse JSON: ${err.message}`);
  }
}

const data = readJson(inputPath);

const overall = data?.overallStatus;
const golden = data?.flows?.golden?.status;
const intermittent = data?.flows?.intermittent?.status;
const artifacts = Array.isArray(data?.artifacts) ? data.artifacts : [];

if (overall !== "healthy") {
  fail(`overallStatus must be healthy but was ${overall}`);
}

if (golden !== "passed") {
  fail(`golden.status must be passed but was ${golden}`);
}

if (!["passed", "skipped"].includes(intermittent)) {
  fail(`intermittent.status must be passed or skipped but was ${intermittent}`);
}

const missingArtifacts = artifacts.filter(a => a.exists !== true);
if (missingArtifacts.length > 0) {
  fail(`Some artifacts are missing: ${missingArtifacts.map(a => a.path).join(", ")}`);
}

console.log("GATE_OK=mobivisor_run.json");
console.log(`overallStatus=${overall}`);
console.log(`golden.status=${golden}`);
console.log(`intermittent.status=${intermittent}`);
console.log(`artifacts.ok=${artifacts.length - missingArtifacts.length}/${artifacts.length}`);

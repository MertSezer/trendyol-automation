"use strict";

const fs = require("fs");

function toBool01(v, def) {
  if (v === undefined || v === null || String(v).trim() === "") return def;
  const s = String(v).trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes" || s === "y") return true;
  if (s === "0" || s === "false" || s === "no" || s === "n") return false;
  return def;
}

function toInt(v, def) {
  if (v === undefined || v === null || String(v).trim() === "") return def;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : def;
}

function mustFile(path, label) {
  if (!fs.existsSync(path)) {
    throw new Error(`${label} file not found: ${path}`);
  }
  return path;
}

function buildConfig(env = process.env) {
  const cfg = {
    // Core demo controls
    demoMode: toBool01(env.DEMO_MODE, false),

    // Dataset
    dataset: env.DATASET ? String(env.DATASET).trim() : "datasets/demo.txt",

    // Scenario controls
    topColors: toInt(env.TOP_COLORS, 3),

    // Meta
    runMode: env.RUN_MODE ? String(env.RUN_MODE).trim() : "e2e",
    tests: env.TESTS ? String(env.TESTS).trim() : "",
  };

  // Validations (enterprise-grade)
  cfg.dataset = mustFile(cfg.dataset, "DATASET");

  if (!Number.isFinite(cfg.topColors) || cfg.topColors <= 0 || cfg.topColors > 20) {
    throw new Error(`TOP_COLORS must be between 1 and 20 (got: ${cfg.topColors})`);
  }

  return Object.freeze(cfg);
}

// Create once (common pattern)
const config = buildConfig();

module.exports = { config, buildConfig };

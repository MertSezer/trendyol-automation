"use strict";

const fs = require("fs");
const path = require("path");

class EvidenceManager {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(process.cwd(), "output", "demo-runs");
    this.runLabel = sanitizeSegment(options.runLabel || "demo");
    this.runId = `${timestampForId()}_${this.runLabel}`;
    this.runDir = path.join(this.baseDir, this.runId);
    this.stepIndex = 0;
    this.steps = [];

    ensureDir(this.baseDir);
    ensureDir(this.runDir);
  }

  startStep(stepName, meta = {}) {
    this.stepIndex += 1;

    const safeStepName = sanitizeSegment(stepName);
    const stepNo = String(this.stepIndex).padStart(3, "0");
    const stepId = `${stepNo}_${safeStepName}`;
    const stepDir = path.join(this.runDir, stepId);

    ensureDir(stepDir);

    const record = {
      index: this.stepIndex,
      stepNo,
      stepId,
      stepName,
      stepDir,
      createdAt: new Date().toISOString(),
      meta: { ...meta },
      files: {},
      status: "started",
    };

    this.steps.push(record);

    this.writeJson(path.join(stepDir, "meta.json"), {
      stepId: record.stepId,
      stepName: record.stepName,
      createdAt: record.createdAt,
      status: record.status,
      ...record.meta,
    });

    return record;
  }

  updateStepMeta(stepRecord, patch = {}) {
    stepRecord.meta = {
      ...stepRecord.meta,
      ...patch,
    };

    this.writeJson(path.join(stepRecord.stepDir, "meta.json"), {
      stepId: stepRecord.stepId,
      stepName: stepRecord.stepName,
      createdAt: stepRecord.createdAt,
      status: stepRecord.status,
      ...stepRecord.meta,
    });
  }

  setStepStatus(stepRecord, status) {
    stepRecord.status = status;
    this.updateStepMeta(stepRecord, {});
  }

  writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  }

  writeText(filePath, content) {
    const text = Array.isArray(content) ? content.join("\n") : String(content || "");
    fs.writeFileSync(filePath, text, "utf8");
  }

  file(stepRecord, fileName) {
    return path.join(stepRecord.stepDir, fileName);
  }

  registerFile(stepRecord, logicalName, absolutePath) {
    const relativePath = path.relative(this.runDir, absolutePath).replace(/\\/g, "/");
    stepRecord.files[logicalName] = relativePath;

    this.writeJson(path.join(stepRecord.stepDir, "manifest.json"), {
      stepId: stepRecord.stepId,
      status: stepRecord.status,
      files: stepRecord.files,
    });
  }

  finalize(summary = {}) {
    const indexPath = path.join(this.runDir, "index.json");

    const payload = {
      runId: this.runId,
      runLabel: this.runLabel,
      runDir: this.runDir,
      generatedAt: new Date().toISOString(),
      summary,
      steps: this.steps.map((step) => ({
        index: step.index,
        stepNo: step.stepNo,
        stepId: step.stepId,
        stepName: step.stepName,
        createdAt: step.createdAt,
        status: step.status,
        meta: step.meta,
        files: step.files,
      })),
    };

    this.writeJson(indexPath, payload);
    return indexPath;
  }
}

async function captureEvidenceStep(params) {
  const {
    I,
    manager,
    stepName,
    meta = {},
    bodyLocator = "body",
    captureBodyText = true,
    noteLines = [],
  } = params;

  const step = manager.startStep(stepName, meta);

  try {
    const fullShotPath = manager.file(step, "full_page.png");
    await I.saveScreenshot(fullShotPath, true);
    manager.registerFile(step, "fullPageScreenshot", fullShotPath);

    let currentUrl = "";
    try {
      currentUrl = await I.grabCurrentUrl();
    } catch (_) {}

    let bodyText = "";
    if (captureBodyText) {
      try {
        bodyText = await I.grabTextFrom(bodyLocator);
      } catch (_) {
        bodyText = "";
      }
    }

    const normalizedBody = String(bodyText || "").replace(/\s+/g, " ").trim();

    if (normalizedBody) {
      const bodyPath = manager.file(step, "body_excerpt.txt");
      manager.writeText(bodyPath, normalizedBody.slice(0, 5000));
      manager.registerFile(step, "bodyExcerpt", bodyPath);
    }

    const state = {
      step: stepName,
      time: new Date().toISOString(),
      url: currentUrl,
      status: "ok",
      ...meta,
    };

    const statePath = manager.file(step, "state.json");
    manager.writeJson(statePath, state);
    manager.registerFile(step, "state", statePath);

    const notePath = manager.file(step, "note.txt");
    manager.writeText(notePath, [
      `step: ${stepName}`,
      `time: ${state.time}`,
      `url: ${currentUrl}`,
      `status: ok`,
      `meta: ${JSON.stringify(meta)}`,
      ...noteLines,
    ]);
    manager.registerFile(step, "note", notePath);

    manager.setStepStatus(step, "ok");
    manager.updateStepMeta(step, {
      url: currentUrl,
      bodyExcerpt: normalizedBody.slice(0, 1000),
    });

    return step;
  } catch (err) {
    const errorText = err && err.message ? err.message : String(err);

    const errorPath = manager.file(step, "error.txt");
    manager.writeText(errorPath, [
      `step: ${stepName}`,
      `status: failed`,
      `error: ${errorText}`,
    ]);
    manager.registerFile(step, "error", errorPath);

    manager.setStepStatus(step, "failed");
    manager.updateStepMeta(step, { error: errorText });

    throw err;
  }
}

async function captureCartEvidence(params) {
  const { I, manager, stepName, cartSnapshot, extra = {}, noteLines = [] } = params;

  return captureEvidenceStep({
    I,
    manager,
    stepName,
    meta: {
      cartCount: cartSnapshot?.cartCount ?? null,
      cartTitles: cartSnapshot?.titles ?? [],
      cartItems: cartSnapshot?.items ?? [],
      bodyExcerpt: cartSnapshot?.bodyExcerpt ?? "",
      ...extra,
    },
    noteLines: [
      `cartCount: ${cartSnapshot?.cartCount ?? ""}`,
      `cartTitles: ${JSON.stringify(cartSnapshot?.titles ?? [])}`,
      ...noteLines,
    ],
  });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeSegment(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "step";
}

function timestampForId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

module.exports = {
  EvidenceManager,
  captureEvidenceStep,
  captureCartEvidence,
};

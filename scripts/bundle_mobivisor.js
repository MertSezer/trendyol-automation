const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "output");
const bundlesRoot = path.join(outputDir, "bundles");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function copyIfExists(src, dest, manifest, kind) {
  const stat = safeStat(src);
  if (!stat || !stat.isFile()) {
    manifest.missing.push({
      kind,
      path: path.relative(projectRoot, src)
    });
    return;
  }

  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);

  manifest.included.push({
    kind,
    path: path.relative(projectRoot, dest),
    size: stat.size
  });
}

function timestampForFolder(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    p(date.getMonth() + 1),
    p(date.getDate())
  ].join("-") + "__" + [
    p(date.getHours()),
    p(date.getMinutes()),
    p(date.getSeconds())
  ].join("-");
}

ensureDir(bundlesRoot);

const bundleName = `mobivisor_bundle_${timestampForFolder()}`;
const bundleDir = path.join(bundlesRoot, bundleName);
ensureDir(bundleDir);

const manifest = {
  bundleName,
  createdAt: new Date().toISOString(),
  root: path.relative(projectRoot, bundleDir),
  included: [],
  missing: []
};

const filesToCopy = [
  { kind: "report", src: path.join(outputDir, "mobivisor_run.json"), dest: path.join(bundleDir, "mobivisor_run.json") },
  { kind: "report", src: path.join(outputDir, "summary.md"), dest: path.join(bundleDir, "summary.md") },
  { kind: "flow-report", src: path.join(outputDir, "case_report.multi.json"), dest: path.join(bundleDir, "case_report.multi.json") },
  { kind: "flow-report", src: path.join(outputDir, "probe_then_run_report.json"), dest: path.join(bundleDir, "probe_then_run_report.json") },

  { kind: "screenshot", src: path.join(outputDir, "pdp_1.png"), dest: path.join(bundleDir, "screenshots", "pdp_1.png") },
  { kind: "screenshot", src: path.join(outputDir, "cart_1.png"), dest: path.join(bundleDir, "screenshots", "cart_1.png") },
  { kind: "screenshot", src: path.join(outputDir, "after_remove_1.png"), dest: path.join(bundleDir, "screenshots", "after_remove_1.png") },
  { kind: "screenshot", src: path.join(outputDir, "probe_then_run_pdp.png"), dest: path.join(bundleDir, "screenshots", "probe_then_run_pdp.png") },
  { kind: "screenshot", src: path.join(outputDir, "probe_then_run_cart.png"), dest: path.join(bundleDir, "screenshots", "probe_then_run_cart.png") },
  { kind: "screenshot", src: path.join(outputDir, "probe_then_run_after_remove.png"), dest: path.join(bundleDir, "screenshots", "probe_then_run_after_remove.png") }
];

for (const item of filesToCopy) {
  copyIfExists(item.src, item.dest, manifest, item.kind);
}

const manifestPath = path.join(bundleDir, "bundle_manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

console.log(`BUNDLE_DIR=${path.relative(projectRoot, bundleDir)}`);
console.log(`BUNDLE_INCLUDED=${manifest.included.length}`);
console.log(`BUNDLE_MISSING=${manifest.missing.length}`);

if (manifest.missing.length > 0) {
  console.log("BUNDLE_MISSING_LIST=");
  for (const m of manifest.missing) {
    console.log(`- ${m.kind}: ${m.path}`);
  }
}

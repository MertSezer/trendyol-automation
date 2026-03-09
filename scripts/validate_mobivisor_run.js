const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const inputPath = process.argv[2] || path.join("output", "mobivisor_run.json");
const schemaPath = process.argv[3] || path.join("schemas", "mobivisor_run.schema.json");

function fail(message, details) {
  console.error(`VALIDATION_FAILED: ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} not found: ${filePath}`);
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (err) {
    fail(`Could not parse ${label}: ${filePath}`, err.message);
  }
}

const data = readJson(inputPath, "Input JSON");
const schema = readJson(schemaPath, "Schema JSON");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);
const ok = validate(data);

if (!ok) {
  const details = validate.errors
    .map((e) => `${e.instancePath || "/"} ${e.message}`)
    .join("\n");
  fail("mobivisor_run.json does not match schema", details);
}

console.log(`VALIDATION_OK=${inputPath}`);

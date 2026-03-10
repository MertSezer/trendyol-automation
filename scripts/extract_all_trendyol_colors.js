const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const inputPath = path.join(process.cwd(), "datasets", "trendyol_candidate_urls.txt");
const outputPath = path.join(process.cwd(), "artifacts", "trendyol_color_scan_results.json");

if (!fs.existsSync(inputPath)) {
  console.error(`DOSYA_YOK=${inputPath}`);
  process.exit(1);
}

const urls = fs
  .readFileSync(inputPath, "utf8")
  .split(/\r?\n/)
  .map((x) => x.trim())
  .filter(Boolean);

const results = [];

for (const url of urls) {
  try {
    console.log(`TARANIYOR=${url}`);
    const output = execFileSync(
      process.execPath,
      [path.join(process.cwd(), "scripts", "extract_trendyol_colors.js"), url],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );

    const lines = output.split(/\r?\n/);
    const start = lines.indexOf("RENK_ADAYLARI_BASLANGIC");
    const end = lines.indexOf("RENK_ADAYLARI_BITIS");

    let colors = [];
    if (start >= 0 && end > start) {
      colors = lines.slice(start + 1, end).map((x) => x.trim()).filter(Boolean);
    }

    results.push({ url, colors, rawOutput: output });
  } catch (err) {
    results.push({
      url,
      colors: [],
      error: err.message
    });
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf8");

console.log(`SONUC_DOSYASI=${outputPath}`);
#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="./output"
REPORT_PATH="$OUTPUT_DIR/fifo-evidence.html"

python3 - <<'PY'
import html
import os

output_dir = "./output"
report_path = os.path.join(output_dir, "fifo-evidence.html")

files = []
if os.path.isdir(output_dir):
    for name in os.listdir(output_dir):
        path = os.path.join(output_dir, name)
        if os.path.isfile(path) and (name.endswith(".png") or name.endswith(".txt")):
            files.append(name)

files.sort()

parts = []
parts.append("<!doctype html><html lang='tr'><head><meta charset='utf-8'><title>FIFO Evidence</title>")
parts.append("<style>body{font-family:Arial;margin:24px;background:#f6f8fb}.card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:16px;margin-bottom:24px}img{max-width:100%;border:1px solid #ccc;border-radius:8px;margin-bottom:12px}pre{background:#111827;color:#e5e7eb;padding:12px;border-radius:8px;white-space:pre-wrap}</style>")
parts.append("</head><body>")
parts.append("<h1>FIFO Cart Evidence Report</h1>")

for name in files:
    parts.append("<div class='card'>")
    parts.append(f"<h2>{html.escape(name)}</h2>")
    path = os.path.join(output_dir, name)

    if name.endswith(".png"):
        parts.append(f"<img src='{html.escape(name)}' alt='{html.escape(name)}'>")
    elif name.endswith(".txt"):
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        parts.append(f"<pre>{html.escape(content)}</pre>")

    parts.append("</div>")

parts.append("</body></html>")

with open(report_path, "w", encoding="utf-8") as f:
    f.write("\n".join(parts))

print(f"Created: {report_path}")
PY

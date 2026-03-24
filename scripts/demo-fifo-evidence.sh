#!/usr/bin/env bash
set -euo pipefail

mkdir -p ./output ./output/logs

find ./output -maxdepth 1 -type f \( -name '*.png' -o -name '*.txt' -o -name 'fifo-evidence.html' -o -name 'fifo-evidence-package.zip' \) -delete || true
rm -f ./output/logs/fifo-evidence-run.log || true

node -c ./tests/multi_product_fifo_evidence_test.js

export TESTS=./tests/multi_product_fifo_evidence_test.js
export CART_LIMIT=3

npx codeceptjs run --steps 2>&1 | tee ./output/logs/fifo-evidence-run.log

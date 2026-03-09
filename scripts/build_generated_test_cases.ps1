$datasetPath = ".\datasets\trendyol_coverage_urls.json"
$outputPath = ".\output\generated_test_cases.md"

if (-not (Test-Path $datasetPath)) {
    Write-Error "DATASET_NOT_FOUND=$datasetPath"
    exit 1
}

New-Item -ItemType Directory -Force .\output | Out-Null

$items = Get-Content $datasetPath -Raw | ConvertFrom-Json

function Get-ScenarioTitle($classification) {
    switch ($classification) {
        "golden_safe"      { return "Full add-to-cart, cart, and remove flow" }
        "direct_add"       { return "Direct add-to-cart flow" }
        "variant_required" { return "Variant-required product handling" }
        "skip_expected"    { return "Skip or non-eligible product handling" }
        default            { return "Generic product flow" }
    }
}

function Get-Preconditions($classification) {
    switch ($classification) {
        "golden_safe" {
            return @(
                "- Product page is reachable",
                "- Product can be added to cart without extra blocking conditions",
                "- Cart and remove flow are expected to succeed"
            )
        }
        "direct_add" {
            return @(
                "- Product page is reachable",
                "- Product is expected to support direct add-to-cart"
            )
        }
        "variant_required" {
            return @(
                "- Product page is reachable",
                "- Product may require size, color, or variant selection before add-to-cart"
            )
        }
        "skip_expected" {
            return @(
                "- URL may redirect, be non-PDP, or be unsuitable for full cart flow",
                "- Flow may end in a controlled skip state"
            )
        }
        default {
            return @(
                "- Product page is reachable"
            )
        }
    }
}

function Get-Steps($classification) {
    switch ($classification) {
        "golden_safe" {
            return @(
                "1. Open product page",
                "2. Accept cookies if displayed",
                "3. Verify that the page is a product detail page",
                "4. Click add-to-cart",
                "5. Navigate to cart",
                "6. Remove the product from cart",
                "7. Verify cart cleanup state"
            )
        }
        "direct_add" {
            return @(
                "1. Open product page",
                "2. Accept cookies if displayed",
                "3. Verify that the page is a product detail page",
                "4. Click add-to-cart",
                "5. Navigate to cart",
                "6. Verify that the cart page is reached"
            )
        }
        "variant_required" {
            return @(
                "1. Open product page",
                "2. Accept cookies if displayed",
                "3. Verify that the page is a product detail page",
                "4. Attempt add-to-cart",
                "5. Detect whether a size, color, or variant selection is required",
                "6. Classify the result accordingly"
            )
        }
        "skip_expected" {
            return @(
                "1. Open URL",
                "2. Accept cookies if displayed",
                "3. Verify whether the page is a valid product detail page",
                "4. If not eligible, classify the case as skipped with reason",
                "5. Do not force full cart flow"
            )
        }
        default {
            return @(
                "1. Open product page",
                "2. Evaluate basic product interaction"
            )
        }
    }
}

function Get-ExpectedResults($classification) {
    switch ($classification) {
        "golden_safe" {
            return @(
                "- Product page opens successfully",
                "- Product is added to cart",
                "- Cart page is opened successfully",
                "- Product is removed successfully",
                "- Final state is classified as passed"
            )
        }
        "direct_add" {
            return @(
                "- Product page opens successfully",
                "- Product is added to cart",
                "- Cart is reachable",
                "- Flow is classified as passed when add and cart steps succeed"
            )
        }
        "variant_required" {
            return @(
                "- Product page opens successfully",
                "- System detects variant dependency if present",
                "- Flow is classified as variant_required or skipped in a controlled way"
            )
        }
        "skip_expected" {
            return @(
                "- URL is evaluated safely",
                "- Ineligible or redirected pages are not forced into false failures",
                "- Flow is classified as skipped with an explicit reason"
            )
        }
        default {
            return @(
                "- Flow is evaluated and classified"
            )
        }
    }
}

$lines = @()
$lines += "# Generated Trendyol Test Cases"
$lines += ""
$lines += "- Source: $datasetPath"
$lines += "- Generated At: $((Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK"))"
$lines += "- Total Cases: $(@($items).Count)"
$lines += ""

$index = 1

foreach ($item in $items) {
    $caseId = "TC-TRENDYOL-{0:d3}" -f $index
    $title = Get-ScenarioTitle $item.classification

    $lines += "## $caseId"
    $lines += "Scenario: $title"
    $lines += "URL: $($item.url)"
    $lines += "Category: $($item.category)"
    $lines += "Brand: $($item.brand)"
    $lines += "Merchant Hint: $($item.merchantHint)"
    $lines += "Classification: $($item.classification)"
    $lines += ""
    $lines += "Preconditions:"
    foreach ($line in (Get-Preconditions $item.classification)) {
        $lines += $line
    }
    $lines += ""
    $lines += "Steps:"
    foreach ($line in (Get-Steps $item.classification)) {
        $lines += $line
    }
    $lines += ""
    $lines += "Expected Results:"
    foreach ($line in (Get-ExpectedResults $item.classification)) {
        $lines += $line
    }
    $lines += ""
    $lines += "---"
    $lines += ""

    $index++
}

$lines | Set-Content $outputPath -Encoding UTF8

Write-Host "WROTE=$outputPath"
Write-Host "TEST_CASES=$(@($items).Count)"

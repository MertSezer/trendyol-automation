# Workflow

## Windows - IMDb manual real-time
$env:MOVIE_URL = "https://www.imdb.com/title/tt0468569/"
$env:CAST_NAME = "Christian Bale"
$env:MANUAL_TIMEOUT_MS = "180000"
$env:POST_SUCCESS_WAIT_MS = "15000"
npm run imdb:manual

## Windows - IMDb interactive explore
$env:MOVIE_URL = "https://www.imdb.com/title/tt0468569/"
npm run imdb:explore

## Linux - IMDb manual real-time
MOVIE_URL="https://www.imdb.com/title/tt0468569/" \
CAST_NAME="Christian Bale" \
MANUAL_TIMEOUT_MS=180000 \
POST_SUCCESS_WAIT_MS=15000 \
npm run imdb:manual

## Git
git pull --rebase origin feat/ci-and-reporting
git add -A
git commit -m "Describe changes"
git push
## Trendyol - manual policy probe

$env:PRODUCT_URL = "https://www.trendyol.com/..."
$env:POST_SUCCESS_WAIT_MS = "15000"
npm run trendyol:manual-policy

## Optional strict assertions

$env:EXPECTED_TEXT = "BURAYA_UYARI_VEYA_DURUM_METNINI_YAZIN"
npm run trendyol:manual-policy

# OR

$env:DISABLED_SELECTOR = "[aria-disabled=""true""]"
$env:EXPECTED_DISABLED_COUNT = "1"
npm run trendyol:manual-policy

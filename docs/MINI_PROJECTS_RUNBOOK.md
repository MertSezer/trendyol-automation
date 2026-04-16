# Mini Projects Runbook

## IMDb — same-page mapping
$env:IMDB_START_URL = "https://www.imdb.com/chart/top/"
$env:EVIDENCE_BASENAME = "shawshank-mapping"
$env:IMDB_MAX_PAIRS = "15"
$env:POST_SUCCESS_WAIT_MS = "5000"
npm run imdb:any:mapping:capture

## Trendyol — redirect switch
$env:TRENDYOL_START_URL = "https://www.trendyol.com/fashcolle/dynamic-green-masajli-oyuncu-koltugu-p-906025507?merchantId=164806&itemNumber=1262426810&boutiqueId=61"
$env:EVIDENCE_BASENAME = "green-to-blue-switch"
$env:POST_SUCCESS_WAIT_MS = "5000"
npm run trendyol:any:redirect-switch

## Trendyol — coexist cart
$env:TRENDYOL_START_URL = "https://www.trendyol.com/fashcolle/dynamic-green-masajli-oyuncu-koltugu-p-906025507?merchantId=164806&itemNumber=1262426810&boutiqueId=61"
$env:EXPECTED_URL_FRAGMENT = "/sepet"
$env:EXPECTED_TEXTS_JSON = '["Dynamic Green Masajlı Oyuncu Koltuğu","Dynamic Blue Masajlı Oyuncu Koltuğu"]'
$env:EVIDENCE_BASENAME = "green-blue-coexist"
$env:POST_SUCCESS_WAIT_MS = "5000"
npm run trendyol:any:coexist-cart

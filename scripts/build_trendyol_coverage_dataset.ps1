$items = @(
    @{
        id = "shoe_001"
        category = "shoes"
        brand = "dark-seer"
        merchantHint = "968"
        url = "https://www.trendyol.com/dark-seer/beyaz-unisex-sneaker-p-42713792?boutiqueId=684007&merchantId=968"
    },
    @{
        id = "shoe_002"
        category = "shoes"
        brand = "dark-seer"
        merchantHint = "968"
        url = "https://www.trendyol.com/dark-seer/beyaz-buz-unisex-sneaker-p-130327366?boutiqueId=681430&merchantId=968"
    },
    @{
        id = "shoe_003"
        category = "shoes"
        brand = "puma"
        merchantHint = "62"
        url = "https://www.trendyol.com/puma/shuffle-ayakkabi-p-815873991?boutiqueId=61&merchantId=62"
    },
    @{
        id = "shoe_004"
        category = "shoes"
        brand = "big-king"
        merchantHint = "333333"
        url = "https://www.trendyol.com/big-king/jean-erkek-ultra-hafif-erkek-spor-ayakkabi-p-906479399?boutiqueId=61&merchantId=333333"
    },
    @{
        id = "shoe_005"
        category = "shoes"
        brand = "dark-seer"
        merchantHint = "968"
        url = "https://www.trendyol.com/dark-seer/beyaz-fume-erkek-sneaker-p-100991468?boutiqueId=681430&merchantId=968"
    },
    @{
        id = "shoe_006"
        category = "shoes"
        brand = "efnanshoes"
        merchantHint = "987187"
        url = "https://www.trendyol.com/efnanshoes/efnan-shoes-erkek-gunluk-ortopedik-taban-rahat-esnek-lastikli-garantili-ayakkabi-p-1104426884?boutiqueId=61&merchantId=987187"
    },
    @{
        id = "shoe_007"
        category = "shoes"
        brand = "tonny-black"
        merchantHint = "106292"
        url = "https://www.trendyol.com/tonny-black/unisex-beyaz-siyah-termo-taban-yani-seritli-bagcikli-spor-ayakkabi-p-879885114?boutiqueId=61&merchantId=106292"
    },
    @{
        id = "shoe_008"
        category = "shoes"
        brand = "big-king"
        merchantHint = "333333"
        url = "https://www.trendyol.com/big-king/jean-erkek-ultra-hafif-erkek-spor-ayakkabi-p-906478247?boutiqueId=61&merchantId=333333"
    },
    @{
        id = "shoe_009"
        category = "shoes"
        brand = "genel-markalar"
        merchantHint = "1124946"
        url = "https://www.trendyol.com/genel-markalar/unisex-spor-ayakkabi-gunluk-sneakers-p-46563277?boutiqueId=61&merchantId=1124946"
    },
    @{
        id = "shoe_010"
        category = "shoes"
        brand = "e-sport"
        merchantHint = "979689"
        url = "https://www.trendyol.com/e-sport/gunluk-siyah-beyaz-erkek-sneaker-ayakkabi-p-973314608?boutiqueId=61&merchantId=979689"
    },
    @{
        id = "shoe_011"
        category = "shoes"
        brand = "by-oxford"
        merchantHint = "625799"
        url = "https://www.trendyol.com/by-oxford/erkek-gunluk-hafif-poli-dikisli-taban-yuruyus-garantili-spor-ayakkabi-p-818931226?boutiqueId=61&merchantId=625799"
    },
    @{
        id = "scarf_001"
        category = "scarves"
        brand = "sebir-moda"
        merchantHint = "1014897"
        url = "https://www.trendyol.com/sebir-moda/kareli-triko-atki-p-1032872467?boutiqueId=61&merchantId=1014897"
    },
    @{
        id = "scarf_002"
        category = "scarves"
        brand = "chuba"
        merchantHint = "108999"
        url = "https://www.trendyol.com/chuba/erkek-sac-orgu-atki-gri-23w502-p-369358971?boutiqueId=61&merchantId=108999"
    }
)

New-Item -ItemType Directory -Force .\datasets | Out-Null
$items | ConvertTo-Json -Depth 5 | Set-Content .\datasets\trendyol_coverage_urls.json -Encoding UTF8

Write-Host "WROTE=.\datasets\trendyol_coverage_urls.json"
Write-Host "COUNT=$($items.Count)"

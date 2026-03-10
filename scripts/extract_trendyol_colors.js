const { Builder, By } = require("selenium-webdriver");
const edge = require("selenium-webdriver/edge");

function normalizeText(value) {
  return (value || "")
    .replace(/\s+/g, " ")
    .trim();
}

async function collectTexts(driver, xpath) {
  const elements = await driver.findElements(By.xpath(xpath));
  const values = [];

  for (const el of elements) {
    try {
      const text = normalizeText(await el.getText());
      const aria = normalizeText(await el.getAttribute("aria-label"));
      const title = normalizeText(await el.getAttribute("title"));

      [text, aria, title].forEach((item) => {
        if (item && item.length > 0) values.push(item);
      });
    } catch (_) {}
  }

  return values;
}

async function run() {
  const url = process.argv[2];

  if (!url) {
    console.error("KULLANIM: node .\\scripts\\extract_trendyol_colors.js <TRENDYOL_URL>");
    process.exit(1);
  }

  const driver = await new Builder()
    .forBrowser("MicrosoftEdge")
    .setEdgeOptions(new edge.Options())
    .build();

  try {
    console.log(`URL=${url}`);
    await driver.get(url);
    await driver.sleep(5000);

    const xpaths = [
      "//*[contains(@data-testid,'variant')]//*[self::button or self::div or self::span or self::a]",
      "//*[contains(@data-testid,'color')]//*[self::button or self::div or self::span or self::a]",
      "//*[contains(@class,'variant')]//*[self::button or self::div or self::span or self::a]",
      "//*[contains(@class,'color')]//*[self::button or self::div or self::span or self::a]",
      "//*[@aria-label[contains(.,'renk')]]",
      "//button",
      "//div",
      "//span"
    ];

    let allTexts = [];

    for (const xpath of xpaths) {
      const values = await collectTexts(driver, xpath);
      allTexts = allTexts.concat(values);
    }

    const blacklist = [
      "sepete ekle",
      "sepete git",
      "değerlendir",
      "yorum",
      "beden",
      "adet",
      "satıcı",
      "kargo",
      "kampanya",
      "favori",
      "kupon",
      "teslimat",
      "yardım",
      "giriş yap",
      "ürün",
      "trendyol",
      "soru sor"
    ];

    const cleaned = [...new Set(
      allTexts
        .map((x) => normalizeText(x))
        .filter((x) => x.length > 0)
        .filter((x) => x.length <= 40)
        .filter((x) => !/\d/.test(x))
        .filter((x) => {
          const lower = x.toLocaleLowerCase("tr-TR");
          return !blacklist.some((b) => lower.includes(b));
        })
    )];

    console.log("RENK_ADAYLARI_BASLANGIC");
    cleaned.forEach((item) => console.log(item));
    console.log("RENK_ADAYLARI_BITIS");
  } finally {
    await driver.quit();
  }
}

run().catch((err) => {
  console.error("HATA=", err && err.message ? err.message : err);
  process.exit(1);
});